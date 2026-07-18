import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import type { SyncedRow, SyncedTable, SyncRepository } from './sync.types';

@Injectable()
export class PrismaSyncRepository implements SyncRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getPrismaDelegate(table: SyncedTable) {
    switch (table) {
      case 'products':
        return this.prisma.product;
      case 'customers':
        return this.prisma.customer;
      case 'inventory_units':
        return this.prisma.inventoryUnit;
      case 'sales':
        return this.prisma.sale;
      case 'sale_items':
        return this.prisma.saleItem;
      case 'returns':
        return this.prisma.return;
      case 'credit_records':
        return this.prisma.creditRecord;
      default:
        return null;
    }
  }

  async findById(
    tenantId: string,
    table: SyncedTable,
    id: string,
  ): Promise<SyncedRow | null> {
    const delegate = this.getPrismaDelegate(table);
    if (!delegate) return null;
    const row = await (delegate as any).findFirst({
      where: { id, tenantId },
    });
    if (!row) return null;

    const meta = await this.prisma.syncRowMeta.findUnique({
      where: {
        tenantId_tableName_rowId: {
          tenantId,
          tableName: table,
          rowId: id,
        },
      },
    });

    return this.toSyncedRow(table, row, meta);
  }

  async findByClientRowId(
    tenantId: string,
    table: SyncedTable,
    clientRowId: string,
  ): Promise<SyncedRow | null> {
    const meta = await this.prisma.syncRowMeta.findUnique({
      where: {
        tenantId_tableName_clientRowId: {
          tenantId,
          tableName: table,
          clientRowId,
        },
      },
    });
    if (!meta) return null;

    const delegate = this.getPrismaDelegate(table);
    if (!delegate) return null;
    const row = await (delegate as any).findFirst({
      where: { id: meta.rowId, tenantId },
    });
    if (!row) return null;

    return this.toSyncedRow(table, row, meta);
  }

  async save(
    row: Omit<SyncedRow, 'seq' | 'updatedAtServer'>,
  ): Promise<SyncedRow> {
    const delegate = this.getPrismaDelegate(row.table);
    if (!delegate) {
      throw new BadRequestException(`Unknown table: ${row.table}`);
    }

    const isDeleted =
      row.data.deleted_at !== null && row.data.deleted_at !== undefined;

    if (isDeleted) {
      // Hard delete from the domain table
      try {
        await (delegate as any).delete({
          where: { id: row.id },
        });
      } catch (e) {
        // Ignore if already deleted
      }
    } else {
      // Map generic data to Prisma schema camelCase + Decimals
      const prismaData = this.toPrismaData(row.table, row.data, row.tenantId);
      await (delegate as any).upsert({
        where: { id: row.id },
        update: prismaData,
        create: { id: row.id, ...prismaData },
      });
    }

    // Sequence allocation (tenant-scoped)
    const maxMeta = await this.prisma.syncRowMeta.findFirst({
      where: { tenantId: row.tenantId },
      orderBy: { seq: 'desc' },
    });
    const seq = (maxMeta?.seq ?? 0n) + 1n;

    // Upsert metadata
    const meta = await this.prisma.syncRowMeta.upsert({
      where: {
        tenantId_tableName_rowId: {
          tenantId: row.tenantId,
          tableName: row.table,
          rowId: row.id,
        },
      },
      update: {
        clientRowId: row.clientRowId,
        seq,
      },
      create: {
        tenantId: row.tenantId,
        tableName: row.table,
        rowId: row.id,
        clientRowId: row.clientRowId,
        seq,
      },
    });

    // Re-fetch or build return row
    if (isDeleted) {
      return {
        id: row.id,
        tenantId: row.tenantId,
        table: row.table,
        clientRowId: row.clientRowId,
        data: {
          deleted_at: row.data.deleted_at,
          updated_at: row.data.updated_at,
        },
        seq: Number(meta.seq),
        updatedAtServer: meta.updatedAt,
      };
    }

    const savedRow = await (delegate as any).findUnique({
      where: { id: row.id },
    });
    return this.toSyncedRow(row.table, savedRow, meta);
  }

  async changesSince(tenantId: string, since: number): Promise<SyncedRow[]> {
    const metas = await this.prisma.syncRowMeta.findMany({
      where: {
        tenantId,
        seq: { gt: BigInt(since) },
      },
      orderBy: { seq: 'asc' },
    });

    const syncedRows: SyncedRow[] = [];
    for (const meta of metas) {
      const table = meta.tableName as SyncedTable;
      const delegate = this.getPrismaDelegate(table);
      if (!delegate) continue;
      const row = await (delegate as any).findFirst({
        where: { id: meta.rowId, tenantId },
      });

      // If the domain row doesn't exist, it means it was deleted.
      // We return it as a tombstone.
      if (!row) {
        syncedRows.push({
          id: meta.rowId,
          tenantId,
          table,
          clientRowId: meta.clientRowId,
          data: {
            deleted_at: meta.updatedAt.toISOString(),
            updated_at: meta.updatedAt.toISOString(),
          },
          seq: Number(meta.seq),
          updatedAtServer: meta.updatedAt,
        });
      } else {
        syncedRows.push(this.toSyncedRow(table, row, meta));
      }
    }
    return syncedRows;
  }

  // ─── Mapping helpers ────────────────────────────────────────────────────────

  private toSyncedRow(table: SyncedTable, row: any, meta: any): SyncedRow {
    return {
      id: row.id,
      tenantId: row.tenantId,
      table,
      clientRowId: meta?.clientRowId ?? null,
      data: this.toWireData(table, row),
      seq: meta ? Number(meta.seq) : 0,
      updatedAtServer: meta?.updatedAt ?? row.updatedAt ?? row.createdAt,
    };
  }

  private toWireData(table: SyncedTable, row: any): Record<string, unknown> {
    const data: Record<string, any> = {};

    // Standard fields common to all
    if (row.createdAt) data.created_at = row.createdAt.toISOString();
    if (row.updatedAt) data.updated_at = row.updatedAt.toISOString();

    switch (table) {
      case 'products':
        data.name = row.name;
        data.sku = row.sku;
        data.brand = row.brand;
        data.category = row.category;
        data.description = row.description;
        data.short_description = row.shortDescription;
        data.image_url = row.imageUrl;
        data.tags = row.tags;
        data.specifications = row.specifications;
        data.cost_price_minor = row.costPrice
          ? Math.round(Number(row.costPrice) * 100)
          : null;
        data.selling_price_minor = Math.round(Number(row.sellingPrice) * 100);
        data.compare_price_minor = row.comparePrice
          ? Math.round(Number(row.comparePrice) * 100)
          : null;
        data.warranty_months = row.warrantyMonths;
        data.is_active = row.isActive;
        data.created_by_id = row.createdById;
        break;

      case 'customers':
        data.name = row.name;
        data.phone = row.phone;
        data.email = row.email;
        break;

      case 'inventory_units':
        data.serial_number = row.serialNumber;
        data.product_local_id = row.productId;
        data.status = row.status;
        data.condition = row.condition;
        data.purchase_price_minor = row.purchasePrice
          ? Math.round(Number(row.purchasePrice) * 100)
          : null;
        data.received_at = row.receivedAt.toISOString();
        data.grn_remote_id = row.grnId;
        data.notes = row.notes;
        break;

      case 'sales':
        data.invoice_number = row.invoiceNumber;
        data.customer_local_id = row.customerId;
        data.sold_by_id = row.soldById;
        data.payment_method = row.paymentMethod;
        data.subtotal_minor = Math.round(Number(row.subtotal) * 100);
        data.discount_amount_minor = Math.round(
          Number(row.discountAmount) * 100,
        );
        data.discount_approved_by_id = row.discountApprovedById;
        data.total_amount_minor = Math.round(Number(row.totalAmount) * 100);
        data.status = row.status;
        data.void_reason = row.voidReason;
        data.voided_by_id = row.voidedById;
        data.is_online = row.isOnline;
        data.customer_city = row.customerCity;
        data.tracking_id = row.trackingId;
        data.delivery_charge_minor = Math.round(
          Number(row.deliveryCharge) * 100,
        );
        data.advance_amount_minor = Math.round(Number(row.advanceAmount) * 100);
        data.cod_amount_minor = Math.round(Number(row.codAmount) * 100);
        data.additional_charges_minor = Math.round(
          Number(row.additionalCharges) * 100,
        );
        data.description = row.description;
        data.shipping_status = row.shippingStatus;
        break;

      case 'sale_items':
        data.sale_local_id = row.saleId;
        data.inventory_unit_local_id = row.inventoryUnitId;
        data.selling_price_minor = Math.round(Number(row.sellingPrice) * 100);
        data.discount_minor = Math.round(Number(row.discount) * 100);
        break;

      case 'returns':
        data.sale_local_id = row.saleId;
        data.inventory_unit_local_id = row.inventoryUnitId;
        data.requested_by_id = row.requestedById;
        data.reason = row.reason;
        data.return_type = row.returnType;
        data.status = row.status;
        data.suspicious_flag = row.suspiciousFlag;
        data.reviewed_by_id = row.reviewedById;
        data.review_notes = row.reviewNotes;
        data.refund_amount_minor = row.refundAmount
          ? Math.round(Number(row.refundAmount) * 100)
          : null;
        data.resolved_at = row.resolvedAt ? row.resolvedAt.toISOString() : null;
        break;

      case 'credit_records':
        data.type = row.type;
        data.status = row.status;
        data.amount_minor = Math.round(Number(row.amount) * 100);
        data.paid_amount_minor = Math.round(Number(row.paidAmount) * 100);
        data.due_amount_minor = Math.round(Number(row.dueAmount) * 100);
        data.description = row.description;
        data.date = row.date.toISOString();
        break;
    }

    return data;
  }

  private toPrismaData(
    table: SyncedTable,
    data: any,
    tenantId: string,
  ): Record<string, any> {
    const prismaData: Record<string, any> = { tenantId };

    // `updatedAt` is deliberately never set here: none of the 7 synced
    // models accept a manually-supplied value for it (products, customers,
    // inventory_units, sales, sale_items, returns have no updatedAt column
    // at all; credit_records' is @updatedAt-managed) — Prisma rejects it as
    // an unknown argument on create/update either way. Confirmed in
    // production 2026-07-18: every push crashed with
    // "Unknown argument `updatedAt`. Did you mean `createdAt`?".
    if (data.created_at) prismaData.createdAt = new Date(data.created_at);

    switch (table) {
      case 'products':
        prismaData.name = data.name;
        prismaData.sku = data.sku;
        prismaData.brand = data.brand;
        prismaData.category = data.category;
        prismaData.description = data.description;
        prismaData.shortDescription = data.short_description;
        prismaData.imageUrl = data.image_url;
        prismaData.tags = Array.isArray(data.tags) ? data.tags : [];
        prismaData.specifications = data.specifications;
        prismaData.costPrice =
          data.cost_price_minor !== null && data.cost_price_minor !== undefined
            ? new Prisma.Decimal(data.cost_price_minor).div(100)
            : null;
        prismaData.sellingPrice = new Prisma.Decimal(
          data.selling_price_minor,
        ).div(100);
        prismaData.comparePrice =
          data.compare_price_minor !== null &&
          data.compare_price_minor !== undefined
            ? new Prisma.Decimal(data.compare_price_minor).div(100)
            : null;
        prismaData.warrantyMonths = data.warranty_months;
        prismaData.isActive = !!data.is_active;
        prismaData.createdById = data.created_by_id;
        break;

      case 'customers':
        prismaData.name = data.name;
        prismaData.phone = data.phone;
        prismaData.email = data.email;
        break;

      case 'inventory_units':
        prismaData.serialNumber = data.serial_number;
        prismaData.productId = data.product_local_id;
        prismaData.status = data.status;
        prismaData.condition = data.condition;
        prismaData.purchasePrice =
          data.purchase_price_minor !== null &&
          data.purchase_price_minor !== undefined
            ? new Prisma.Decimal(data.purchase_price_minor).div(100)
            : null;
        prismaData.receivedAt = new Date(data.received_at);
        prismaData.grnId = data.grn_remote_id;
        prismaData.notes = data.notes;
        break;

      case 'sales':
        prismaData.invoiceNumber = data.invoice_number;
        prismaData.customerId = data.customer_local_id;
        prismaData.soldById = data.sold_by_id;
        prismaData.paymentMethod = data.payment_method;
        prismaData.subtotal = new Prisma.Decimal(data.subtotal_minor).div(100);
        prismaData.discountAmount = new Prisma.Decimal(
          data.discount_amount_minor,
        ).div(100);
        prismaData.discountApprovedById = data.discount_approved_by_id;
        prismaData.totalAmount = new Prisma.Decimal(
          data.total_amount_minor,
        ).div(100);
        prismaData.status = data.status;
        prismaData.voidReason = data.void_reason;
        prismaData.voidedById = data.voided_by_id;
        prismaData.isOnline = !!data.is_online;
        prismaData.customerCity = data.customer_city;
        prismaData.trackingId = data.tracking_id;
        prismaData.deliveryCharge = new Prisma.Decimal(
          data.delivery_charge_minor,
        ).div(100);
        prismaData.advanceAmount = new Prisma.Decimal(
          data.advance_amount_minor,
        ).div(100);
        prismaData.codAmount = new Prisma.Decimal(data.cod_amount_minor).div(
          100,
        );
        prismaData.additionalCharges = new Prisma.Decimal(
          data.additional_charges_minor,
        ).div(100);
        prismaData.description = data.description;
        prismaData.shippingStatus = data.shipping_status;
        break;

      case 'sale_items':
        prismaData.saleId = data.sale_local_id;
        prismaData.inventoryUnitId = data.inventory_unit_local_id;
        prismaData.sellingPrice = new Prisma.Decimal(
          data.selling_price_minor,
        ).div(100);
        prismaData.discount = new Prisma.Decimal(data.discount_minor).div(100);
        break;

      case 'returns':
        prismaData.saleId = data.sale_local_id;
        prismaData.inventoryUnitId = data.inventory_unit_local_id;
        prismaData.requestedById = data.requested_by_id;
        prismaData.reason = data.reason;
        prismaData.returnType = data.return_type;
        prismaData.status = data.status;
        prismaData.suspiciousFlag = !!data.suspicious_flag;
        prismaData.reviewedById = data.reviewed_by_id;
        prismaData.reviewNotes = data.review_notes;
        prismaData.refundAmount =
          data.refund_amount_minor !== null &&
          data.refund_amount_minor !== undefined
            ? new Prisma.Decimal(data.refund_amount_minor).div(100)
            : null;
        prismaData.resolvedAt = data.resolved_at
          ? new Date(data.resolved_at)
          : null;
        break;

      case 'credit_records':
        prismaData.type = data.type;
        prismaData.status = data.status;
        prismaData.amount = new Prisma.Decimal(data.amount_minor).div(100);
        prismaData.paidAmount = new Prisma.Decimal(data.paid_amount_minor).div(
          100,
        );
        prismaData.dueAmount = new Prisma.Decimal(data.due_amount_minor).div(
          100,
        );
        prismaData.description = data.description;
        prismaData.date = new Date(data.date);
        break;
    }

    return prismaData;
  }
}
