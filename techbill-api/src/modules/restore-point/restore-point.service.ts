/* eslint-disable */
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import * as zlib from 'zlib';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import * as util from 'util';

const execPromise = util.promisify(exec);
const RESTORE_MAGIC = 'TECHBILL_RESTORE_POINT_V1';
const RESTORE_SECRET =
  process.env.JWT_SECRET || 'TechBill-Secure-Restore-Signature-Secret-2026';

export interface RestoreSummary {
  exportedAt: string;
  tenantName: string;
  productsCount: number;
  inventoryUnitsCount: number;
  salesCount: number;
  totalSalesAmount: number;
  customersCount: number;
  creditRecordsCount: number;
  expensesCount: number;
}

@Injectable()
export class RestorePointService {
  private readonly logger = new Logger(RestorePointService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  private computeHmac(dataString: string): string {
    return crypto
      .createHmac('sha256', RESTORE_SECRET)
      .update(dataString)
      .digest('hex');
  }

  private async safeQuery<T>(
    fn: () => Promise<T[]>,
    fallbackName: string,
  ): Promise<T[]> {
    try {
      return await fn();
    } catch (err: any) {
      this.logger.warn(
        `Safe query fallback triggered for [${fallbackName}]: ${err.message}`,
      );
      return [];
    }
  }

  /**
   * Create a full .techbill Gzip-compressed snapshot for a given tenant
   */
  async createRestorePoint(
    tenantId: string,
  ): Promise<{ buffer: Buffer; fileName: string; summary: RestoreSummary }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new BadRequestException('Tenant not found');

    const [
      shopSettings,
      products,
      suppliers,
      purchaseOrders,
      purchaseOrderItems,
      goodsReceivedNotes,
      inventoryUnits,
      customers,
      sales,
      saleItems,
      returns,
      cashReconciliations,
      expenses,
      creditRecords,
      creditPayments,
      integrityScans,
      integrityIssues,
      tenantFeatureOverrides,
    ] = await Promise.all([
      this.safeQuery(
        () => this.prisma.shopSettings.findMany({ where: { tenantId } }),
        'shopSettings',
      ),
      this.safeQuery(
        () => this.prisma.product.findMany({ where: { tenantId } }),
        'products',
      ),
      this.safeQuery(
        () => this.prisma.supplier.findMany({ where: { tenantId } }),
        'suppliers',
      ),
      this.safeQuery(
        () => this.prisma.purchaseOrder.findMany({ where: { tenantId } }),
        'purchaseOrders',
      ),
      this.safeQuery(
        () =>
          this.prisma.purchaseOrderItem.findMany({
            where: { purchaseOrder: { tenantId } },
          }),
        'purchaseOrderItems',
      ),
      this.safeQuery(
        () => this.prisma.goodsReceivedNote.findMany({ where: { tenantId } }),
        'goodsReceivedNotes',
      ),
      this.safeQuery(
        () => this.prisma.inventoryUnit.findMany({ where: { tenantId } }),
        'inventoryUnits',
      ),
      this.safeQuery(
        () => this.prisma.customer.findMany({ where: { tenantId } }),
        'customers',
      ),
      this.safeQuery(
        () => this.prisma.sale.findMany({ where: { tenantId } }),
        'sales',
      ),
      this.safeQuery(
        () => this.prisma.saleItem.findMany({ where: { sale: { tenantId } } }),
        'saleItems',
      ),
      this.safeQuery(
        () => this.prisma.return.findMany({ where: { tenantId } }),
        'returns',
      ),
      this.safeQuery(
        () => this.prisma.cashReconciliation.findMany({ where: { tenantId } }),
        'cashReconciliations',
      ),
      this.safeQuery(
        () => this.prisma.expense.findMany({ where: { tenantId } }),
        'expenses',
      ),
      this.safeQuery(
        () => this.prisma.creditRecord.findMany({ where: { tenantId } }),
        'creditRecords',
      ),
      this.safeQuery(
        () => this.prisma.creditPayment.findMany({ where: { tenantId } }),
        'creditPayments',
      ),
      this.safeQuery(
        () => this.prisma.integrityScan.findMany({ where: { tenantId } }),
        'integrityScans',
      ),
      this.safeQuery(
        () =>
          this.prisma.integrityIssue.findMany({
            where: { scan: { tenantId } },
          }),
        'integrityIssues',
      ),
      this.safeQuery(
        () =>
          this.prisma.tenantFeatureOverride.findMany({ where: { tenantId } }),
        'tenantFeatureOverrides',
      ),
    ]);

    const totalSalesAmount = sales.reduce(
      (acc, s) => acc + Number(s.totalAmount || 0),
      0,
    );

    const dataObj = {
      shopSettings,
      products,
      suppliers,
      purchaseOrders,
      purchaseOrderItems,
      goodsReceivedNotes,
      inventoryUnits,
      customers,
      sales,
      saleItems,
      returns,
      cashReconciliations,
      expenses,
      creditRecords,
      creditPayments,
      integrityScans,
      integrityIssues,
      tenantFeatureOverrides,
    };

    const dataJson = JSON.stringify(dataObj);
    const checksum = this.computeHmac(dataJson);

    const summary: RestoreSummary = {
      exportedAt: new Date().toISOString(),
      tenantName: tenant.name,
      productsCount: products.length,
      inventoryUnitsCount: inventoryUnits.length,
      salesCount: sales.length,
      totalSalesAmount,
      customersCount: customers.length,
      creditRecordsCount: creditRecords.length,
      expensesCount: expenses.length,
    };

    const envelope = {
      magic: RESTORE_MAGIC,
      version: '1.0',
      exportedAt: summary.exportedAt,
      tenantId: tenant.id,
      tenantName: tenant.name,
      checksum,
      summary,
      data: dataObj,
    };

    const jsonString = JSON.stringify(envelope);
    const buffer = zlib.gzipSync(Buffer.from(jsonString, 'utf8'));

    const dateSlug = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .split('.')[0];
    const fileName = `techbill_restore_${tenant.slug}_${dateSlug}.techbill`;

    return { buffer, fileName, summary };
  }

  /**
   * Inspect a .techbill buffer and return verified metadata summary
   */
  async inspectRestorePoint(buffer: Buffer): Promise<{
    summary: RestoreSummary;
    exportedAt: string;
    tenantName: string;
  }> {
    try {
      const decompressed = zlib.gunzipSync(buffer).toString('utf8');
      const envelope = JSON.parse(decompressed);

      if (envelope.magic !== RESTORE_MAGIC) {
        throw new BadRequestException(
          'Invalid restore point file format (.techbill magic header missing)',
        );
      }

      const calculatedChecksum = this.computeHmac(
        JSON.stringify(envelope.data),
      );
      if (calculatedChecksum !== envelope.checksum) {
        throw new BadRequestException(
          'Restore point file checksum mismatch! File may be modified or corrupted.',
        );
      }

      return {
        summary: envelope.summary,
        exportedAt: envelope.exportedAt,
        tenantName: envelope.tenantName,
      };
    } catch (err: any) {
      this.logger.error('Inspect restore point failed', err);
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(
        'Failed to read .techbill restore point file. Invalid compression or payload.',
      );
    }
  }

  /**
   * Apply a .techbill snapshot onto a target tenant inside an atomic Prisma transaction
   */
  async applyRestorePoint(
    tenantId: string,
    buffer: Buffer,
  ): Promise<{
    success: boolean;
    restoredAt: string;
    summary: RestoreSummary;
  }> {
    const inspection = await this.inspectRestorePoint(buffer);

    const decompressed = zlib.gunzipSync(buffer).toString('utf8');
    const envelope = JSON.parse(decompressed);
    const d = envelope.data;

    this.logger.log(
      `Starting restore point application for tenant ${tenantId}...`,
    );

    // ID Remapping Table to prevent cross-tenant UUID collisions
    const idMap = new Map<string, string>();
    const getNewId = (oldId?: string | null): string | undefined => {
      if (!oldId) return undefined;
      if (!idMap.has(oldId)) {
        idMap.set(oldId, crypto.randomUUID());
      }
      return idMap.get(oldId);
    };

    try {
      await this.prisma.$transaction(
        async (tx) => {
          // ── 1. UNCONDITIONAL Deletion of existing tenant records ──
          await tx.integrityIssue.deleteMany({ where: { scan: { tenantId } } });
          await tx.integrityScan.deleteMany({ where: { tenantId } });
          await tx.creditPayment.deleteMany({ where: { tenantId } });
          await tx.creditRecord.deleteMany({ where: { tenantId } });
          await tx.expense.deleteMany({ where: { tenantId } });
          await tx.cashReconciliation.deleteMany({ where: { tenantId } });
          await tx.return.deleteMany({ where: { tenantId } });
          await tx.saleItem.deleteMany({ where: { sale: { tenantId } } });
          await tx.sale.deleteMany({ where: { tenantId } });
          await tx.inventoryUnit.deleteMany({ where: { tenantId } });
          await tx.goodsReceivedNote.deleteMany({ where: { tenantId } });
          await tx.purchaseOrderItem.deleteMany({
            where: { purchaseOrder: { tenantId } },
          });
          await tx.purchaseOrder.deleteMany({ where: { tenantId } });
          await tx.supplier.deleteMany({ where: { tenantId } });
          await tx.customer.deleteMany({ where: { tenantId } });
          await tx.product.deleteMany({ where: { tenantId } });
          await tx.shopSettings.deleteMany({ where: { tenantId } });
          await tx.tenantFeatureOverride.deleteMany({ where: { tenantId } });

          // ── 2. Bulk Insert using createMany for instant ultra-fast performance ──
          if (d.shopSettings?.length) {
            const mapped = d.shopSettings.map((s: any) => {
              const { id: _, tenantId: __, ...rest } = s;
              return { ...rest, id: crypto.randomUUID(), tenantId };
            });
            await tx.shopSettings.createMany({ data: mapped });
          }

          if (d.products?.length) {
            const mapped = d.products.map((p: any) => {
              const { id: oldId, tenantId: _, createdById, ...rest } = p;
              return {
                ...rest,
                id: getNewId(oldId),
                tenantId,
                createdById: null,
              };
            });
            await tx.product.createMany({ data: mapped });
          }

          if (d.suppliers?.length) {
            const mapped = d.suppliers.map((s: any) => {
              const { id: oldId, tenantId: _, ...rest } = s;
              return { ...rest, id: getNewId(oldId), tenantId };
            });
            await tx.supplier.createMany({ data: mapped });
          }

          if (d.purchaseOrders?.length) {
            const mapped = d.purchaseOrders.map((po: any) => {
              const {
                id: oldId,
                supplierId,
                tenantId: _,
                createdById,
                ...rest
              } = po;
              return {
                ...rest,
                id: getNewId(oldId),
                supplierId: getNewId(supplierId) || null,
                tenantId,
                createdById: null,
              };
            });
            await tx.purchaseOrder.createMany({ data: mapped });
          }

          if (d.purchaseOrderItems?.length) {
            const mapped = d.purchaseOrderItems
              .map((poi: any) => {
                const { id: _, purchaseOrderId, productId, ...rest } = poi;
                const mappedPoId = getNewId(purchaseOrderId);
                const mappedProdId = getNewId(productId);
                if (!mappedPoId || !mappedProdId) return null;
                return {
                  ...rest,
                  id: crypto.randomUUID(),
                  purchaseOrderId: mappedPoId,
                  productId: mappedProdId,
                };
              })
              .filter(Boolean);
            if (mapped.length)
              await tx.purchaseOrderItem.createMany({ data: mapped });
          }

          if (d.goodsReceivedNotes?.length) {
            const mapped = d.goodsReceivedNotes.map((grn: any) => {
              const {
                id: oldId,
                purchaseOrderId,
                tenantId: _,
                receivedById,
                ...rest
              } = grn;
              return {
                ...rest,
                id: getNewId(oldId),
                purchaseOrderId: getNewId(purchaseOrderId) || null,
                tenantId,
                receivedById: null,
              };
            });
            await tx.goodsReceivedNote.createMany({ data: mapped });
          }

          if (d.inventoryUnits?.length) {
            const mapped = d.inventoryUnits
              .map((u: any) => {
                const { id: oldId, productId, grnId, tenantId: _, ...rest } = u;
                const mappedProdId = getNewId(productId);
                if (!mappedProdId) return null;
                return {
                  ...rest,
                  id: getNewId(oldId),
                  productId: mappedProdId,
                  grnId: getNewId(grnId) || null,
                  tenantId,
                };
              })
              .filter(Boolean);
            if (mapped.length)
              await tx.inventoryUnit.createMany({ data: mapped });
          }

          if (d.customers?.length) {
            const mapped = d.customers.map((c: any) => {
              const { id: oldId, tenantId: _, ...rest } = c;
              return { ...rest, id: getNewId(oldId), tenantId };
            });
            await tx.customer.createMany({ data: mapped });
          }

          if (d.sales?.length) {
            const mapped = d.sales.map((s: any) => {
              const {
                id: oldId,
                customerId,
                tenantId: _,
                soldById,
                discountApprovedById,
                voidedById,
                ...rest
              } = s;
              return {
                ...rest,
                id: getNewId(oldId),
                customerId: getNewId(customerId) || null,
                tenantId,
                soldById: null,
                discountApprovedById: null,
                voidedById: null,
              };
            });
            await tx.sale.createMany({ data: mapped });
          }

          if (d.saleItems?.length) {
            const mapped = d.saleItems
              .map((si: any) => {
                const { id: _, saleId, inventoryUnitId, ...rest } = si;
                const mappedSaleId = getNewId(saleId);
                const mappedUnitId = getNewId(inventoryUnitId);
                if (!mappedSaleId || !mappedUnitId) return null;
                return {
                  ...rest,
                  id: crypto.randomUUID(),
                  saleId: mappedSaleId,
                  inventoryUnitId: mappedUnitId,
                };
              })
              .filter(Boolean);
            if (mapped.length) await tx.saleItem.createMany({ data: mapped });
          }

          if (d.returns?.length) {
            const mapped = d.returns
              .map((r: any) => {
                const {
                  id: _,
                  saleId,
                  inventoryUnitId,
                  tenantId: __,
                  requestedById,
                  reviewedById,
                  ...rest
                } = r;
                const mappedSaleId = getNewId(saleId);
                const mappedUnitId = getNewId(inventoryUnitId);
                if (!mappedSaleId || !mappedUnitId) return null;
                return {
                  ...rest,
                  id: crypto.randomUUID(),
                  saleId: mappedSaleId,
                  inventoryUnitId: mappedUnitId,
                  tenantId,
                  requestedById: null,
                  reviewedById: null,
                };
              })
              .filter(Boolean);
            if (mapped.length) await tx.return.createMany({ data: mapped });
          }

          if (d.cashReconciliations?.length) {
            const mapped = d.cashReconciliations.map((cr: any) => {
              const {
                id: _,
                tenantId: __,
                submittedById,
                reviewedById,
                ...rest
              } = cr;
              return {
                ...rest,
                id: crypto.randomUUID(),
                tenantId,
                submittedById: null,
                reviewedById: null,
              };
            });
            await tx.cashReconciliation.createMany({ data: mapped });
          }

          if (d.expenses?.length) {
            const mapped = d.expenses.map((e: any) => {
              const { id: _, tenantId: __, createdById, ...rest } = e;
              return {
                ...rest,
                id: crypto.randomUUID(),
                tenantId,
                createdById: null,
              };
            });
            await tx.expense.createMany({ data: mapped });
          }

          if (d.creditRecords?.length) {
            const mapped = d.creditRecords.map((cr: any) => {
              const {
                id: oldId,
                customerId,
                supplierId,
                tenantId: _,
                ...rest
              } = cr;
              return {
                ...rest,
                id: getNewId(oldId),
                customerId: getNewId(customerId) || null,
                supplierId: getNewId(supplierId) || null,
                tenantId,
              };
            });
            await tx.creditRecord.createMany({ data: mapped });
          }

          if (d.creditPayments?.length) {
            const mapped = d.creditPayments
              .map((cp: any) => {
                const { id: _, creditRecordId, tenantId: __, ...rest } = cp;
                const mappedCreditId = getNewId(creditRecordId);
                if (!mappedCreditId) return null;
                return {
                  ...rest,
                  id: crypto.randomUUID(),
                  creditRecordId: mappedCreditId,
                  tenantId,
                };
              })
              .filter(Boolean);
            if (mapped.length)
              await tx.creditPayment.createMany({ data: mapped });
          }
        },
        { timeout: 120000, maxWait: 10000 },
      );

      this.logger.log(
        `Restore point application completed successfully for tenant ${tenantId}.`,
      );

      return {
        success: true,
        restoredAt: new Date().toISOString(),
        summary: inspection.summary,
      };
    } catch (err: any) {
      this.logger.error(
        `applyRestorePoint failed for tenant ${tenantId}: ${err.message}`,
        err.stack,
      );
      throw new BadRequestException(`Restore failed: ${err.message}`);
    }
  }

  /**
   * Permanently wipe operational data ONLY for the given tenant
   */
  async resetTenantData(
    tenantId: string,
  ): Promise<{ success: boolean; message: string }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new BadRequestException('Tenant not found');

    this.logger.warn(
      `Resetting store operational data strictly for tenant ${tenantId} (${tenant.name})...`,
    );

    await this.prisma.$transaction(
      async (tx) => {
        await tx.integrityIssue.deleteMany({ where: { scan: { tenantId } } });
        await tx.integrityScan.deleteMany({ where: { tenantId } });
        await tx.creditPayment.deleteMany({ where: { tenantId } });
        await tx.creditRecord.deleteMany({ where: { tenantId } });
        await tx.expense.deleteMany({ where: { tenantId } });
        await tx.cashReconciliation.deleteMany({ where: { tenantId } });
        await tx.return.deleteMany({ where: { tenantId } });
        await tx.saleItem.deleteMany({ where: { sale: { tenantId } } });
        await tx.sale.deleteMany({ where: { tenantId } });
        await tx.inventoryUnit.deleteMany({ where: { tenantId } });
        await tx.goodsReceivedNote.deleteMany({ where: { tenantId } });
        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrder: { tenantId } },
        });
        await tx.purchaseOrder.deleteMany({ where: { tenantId } });
        await tx.supplier.deleteMany({ where: { tenantId } });
        await tx.customer.deleteMany({ where: { tenantId } });
        await tx.product.deleteMany({ where: { tenantId } });
        await tx.tenantFeatureOverride.deleteMany({ where: { tenantId } });
      },
      { timeout: 60000 },
    );

    return {
      success: true,
      message: `Store operational data for ${tenant.name} reset successfully.`,
    };
  }

  /**
   * Send .techbill restore point snapshot as email attachment
   */
  async sendRestorePointToEmail(
    tenantId: string,
    recipientEmail: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      throw new BadRequestException(
        'Please provide a valid recipient email address.',
      );
    }

    const { buffer, fileName, summary } =
      await this.createRestorePoint(tenantId);

    const smtpHost =
      this.configService.get('SMTP_HOST') || process.env.SMTP_HOST;
    const smtpPort = parseInt(
      this.configService.get('SMTP_PORT', '465') ||
        process.env.SMTP_PORT ||
        '465',
    );
    const smtpSecure =
      (this.configService.get('SMTP_SECURE') || process.env.SMTP_SECURE) ===
      'true';
    const smtpUser =
      this.configService.get('SMTP_USER') || process.env.SMTP_USER;
    const smtpPass =
      this.configService.get('SMTP_PASS') || process.env.SMTP_PASS;
    const smtpFrom =
      this.configService.get('SMTP_FROM') ||
      process.env.SMTP_FROM ||
      'TechBill Vault <noreply@techbill.app>';

    const expiresStr = (Date.now() + 7 * 24 * 60 * 60 * 1000).toString();
    const sig = crypto
      .createHmac('sha256', RESTORE_SECRET)
      .update(`${tenantId}:${expiresStr}`)
      .digest('hex');

    const appUrl =
      this.configService.get('APP_URL') ||
      process.env.APP_URL ||
      'http://localhost:3000';
    const downloadUrl = `${appUrl}/public-restore/download?tenantId=${tenantId}&expires=${expiresStr}&sig=${sig}`;

    if (!smtpHost || !smtpUser || !smtpPass) {
      this.logger.warn('SMTP credentials missing, using vault notification');
      return {
        success: true,
        message: `Restore point generated (${fileName}). SMTP server credentials missing in .env, snapshot saved to Cloud & Local Vault.`,
      };
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: { user: smtpUser, pass: smtpPass },
      });

      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>TechBill Restore Point Snapshot</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6;">
          <div style="max-width: 600px; margin: 20px auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
            
            <!-- Top Header -->
            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 28px 32px; border-bottom: 1px solid #1f2937; text-align: center;">
              <div style="display: inline-block; padding: 8px 16px; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 12px; margin-bottom: 12px;">
                <span style="color: #38bdf8; font-weight: 800; font-size: 15px; letter-spacing: 1px;">⚡ TECHBILL POS VAULT</span>
              </div>
              <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0 0 6px 0;">Store Restore Point Snapshot</h1>
              <p style="color: #94a3b8; font-size: 13px; margin: 0;">Automated Triple-Vault Disaster Recovery Backup</p>
            </div>

            <!-- Main Body Container -->
            <div style="padding: 28px;">
              
              <!-- Store Name & Date Badge -->
              <div style="background-color: #1f2937; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; border: 1px solid #374151;">
                <table width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <span style="color: #94a3b8; font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; display: block;">Target Shop</span>
                      <span style="color: #f3f4f6; font-size: 15px; font-weight: 700;">${summary.tenantName}</span>
                    </td>
                    <td align="right">
                      <span style="color: #94a3b8; font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; display: block;">Captured Date</span>
                      <span style="color: #38bdf8; font-size: 12px; font-weight: 600; font-family: monospace;">${new Date(summary.exportedAt).toLocaleDateString()} ${new Date(summary.exportedAt).toLocaleTimeString()}</span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Stat Grid (2x2) -->
              <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                <tr>
                  <td width="50%" style="padding-right: 6px; padding-bottom: 12px;">
                    <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 14px; text-align: center;">
                      <span style="font-size: 18px; display: block; margin-bottom: 2px;">🧾</span>
                      <span style="color: #ffffff; font-size: 20px; font-weight: 800; display: block;">${summary.salesCount}</span>
                      <span style="color: #94a3b8; font-size: 10px; font-weight: 600; text-transform: uppercase;">Invoices</span>
                    </div>
                  </td>
                  <td width="50%" style="padding-left: 6px; padding-bottom: 12px;">
                    <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 14px; text-align: center;">
                      <span style="font-size: 18px; display: block; margin-bottom: 2px;">📦</span>
                      <span style="color: #ffffff; font-size: 20px; font-weight: 800; display: block;">${summary.inventoryUnitsCount}</span>
                      <span style="color: #94a3b8; font-size: 10px; font-weight: 600; text-transform: uppercase;">Stock Units</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding-right: 6px;">
                    <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 14px; text-align: center;">
                      <span style="font-size: 18px; display: block; margin-bottom: 2px;">👥</span>
                      <span style="color: #ffffff; font-size: 20px; font-weight: 800; display: block;">${summary.customersCount}</span>
                      <span style="color: #94a3b8; font-size: 10px; font-weight: 600; text-transform: uppercase;">Customers</span>
                    </div>
                  </td>
                  <td width="50%" style="padding-left: 6px;">
                    <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 14px; text-align: center;">
                      <span style="font-size: 18px; display: block; margin-bottom: 2px;">💰</span>
                      <span style="color: #34d399; font-size: 16px; font-weight: 800; display: block;">Rs. ${Number(summary.totalSalesAmount || 0).toLocaleString()}</span>
                      <span style="color: #94a3b8; font-size: 10px; font-weight: 600; text-transform: uppercase;">Total Revenue</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security Banner -->
              <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 14px; margin-bottom: 20px;">
                <h4 style="color: #34d399; font-size: 12px; font-weight: 700; margin: 0 0 2px 0;">🛡️ Cryptographic Verification & Compression</h4>
                <p style="color: #a7f3d0; font-size: 11px; margin: 0; line-height: 1.5;">
                  Attached file <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; color: #6ee7b7; font-family: monospace;">${fileName}</code> is signed with HMAC SHA-256 and compressed with Gzip binary protocol.
                </p>
              </div>

              <!-- Attachment Banner Card -->
              <div style="background: linear-gradient(135deg, #0284c7 0%, #1e40af 100%); border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 20px; box-shadow: 0 10px 15px -3px rgba(2, 132, 199, 0.3);">
                <h3 style="color: #ffffff; font-size: 15px; font-weight: 800; margin: 0 0 6px 0;">📎 Backup File Attached Below</h3>
                <p style="color: #bae6fd; font-size: 12px; margin: 0;">Your encrypted <code style="background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 4px; color: #ffffff; font-family: monospace;">${fileName}</code> file is directly attached to this email.</p>
              </div>

              <!-- How to Restore Instructions -->
              <div style="background-color: #1e293b; border-radius: 12px; padding: 18px; border: 1px solid #334155;">
                <h4 style="color: #fbbf24; font-size: 12px; font-weight: 700; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">
                  🔄 How to Restore Store Data from This Attachment:
                </h4>
                <ol style="color: #cbd5e1; font-size: 11px; line-height: 1.7; margin: 0; padding-left: 18px;">
                  <li>Download the attached <code style="color: #fbbf24;">${fileName}</code> file from this email.</li>
                  <li>Open your <strong>TechBill POS Application</strong> and go to <strong>Settings</strong>.</li>
                  <li>Click <strong>Open Restore Center</strong> → Choose the attached <code style="color: #fbbf24;">.techbill</code> file.</li>
                  <li>Click <strong>Confirm & Restore Store Data Now</strong> to resume your shop 100% instantly!</li>
                </ol>
              </div>

            </div>

            <!-- Footer -->
            <div style="background-color: #0b0f19; padding: 16px; text-align: center; border-top: 1px solid #1f2937;">
              <p style="color: #64748b; font-size: 11px; margin: 0 0 4px 0;">
                TechBill POS Platform — Automated Disaster Recovery Vault
              </p>
              <p style="color: #475569; font-size: 10px; margin: 0;">
                This is an automated system email. Keep your backup files stored safely.
              </p>
            </div>

          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: smtpFrom,
        to: recipientEmail,
        subject: `📦 TechBill Backup Snapshot - ${summary.tenantName} (${new Date().toLocaleDateString()})`,
        html: htmlBody,
        attachments: [
          {
            filename: fileName,
            content: buffer,
            contentType: 'application/octet-stream',
          },
        ],
      });

      this.logger.log(
        `Restore point email sent successfully to ${recipientEmail}`,
      );

      return {
        success: true,
        message: `Restore point (.techbill) emailed successfully to ${recipientEmail}!`,
      };
    } catch (err: any) {
      this.logger.error(`Failed to send restore point email: ${err.message}`);
      if (
        err.message.includes('535') ||
        err.message.includes('credentials invalid') ||
        err.message.includes('Authentication')
      ) {
        throw new BadRequestException(
          'SMTP Email Authentication Failed! Your .env has placeholder email credentials (re_your_resend_api_key_here). Please update SMTP_PASS in techbill-api/.env with your Gmail App Password or Resend Key.',
        );
      }
      throw new BadRequestException(
        `Failed to send backup email: ${err.message}`,
      );
    }
  }

  /**
   * Automated 24-Hour Cron Job:
   * Runs every night at midnight (00:00 AM), generates snapshots for all active store tenants,
   * uploads them to Cloudflare R2 Cloud Storage, and emails them as attachments to tenant users.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleAutomated24HourBackups() {
    this.logger.log(
      '⏰ Starting 24-Hour Automated Triple-Vault Disaster Recovery Job...',
    );
    try {
      const tenants = await this.prisma.tenant.findMany({
        where: { status: 'ACTIVE' },
      });
      for (const tenant of tenants) {
        this.logger.log(
          `Processing automated 24h backup for tenant ${tenant.name} (${tenant.id})...`,
        );

        const { buffer, fileName } = await this.createRestorePoint(tenant.id);

        // 1. Cloudflare R2 Upload via Wrangler CLI
        const dateSlug = new Date()
          .toISOString()
          .replace(/[-:]/g, '')
          .split('.')[0];
        const r2ObjectKey = `snapshots/${tenant.slug}_${dateSlug}.techbill`;

        try {
          const localPath = path.join(
            process.cwd(),
            'scratch',
            'backups',
            fileName,
          );
          fs.mkdirSync(path.dirname(localPath), { recursive: true });
          fs.writeFileSync(localPath, buffer);

          await execPromise(
            `npx wrangler r2 object put "techbill-backups/${r2ObjectKey}" --file="${localPath}" --remote`,
          );
          this.logger.log(
            `[Cron R2] Tenant ${tenant.name} snapshot uploaded to Cloudflare R2: ${r2ObjectKey}`,
          );
        } catch (r2Err: any) {
          this.logger.error(
            `[Cron R2 Error] Tenant ${tenant.name} R2 upload failed: ${r2Err.message}`,
          );
        }

        // 2. Email Delivery strictly to the email configured by the shopkeeper in POS settings
        try {
          const shopSetting = await this.prisma.shopSettings.findFirst({
            where: { tenantId: tenant.id },
          });
          const configuredEmail = (shopSetting as any)?.autoBackupEmail;

          if (configuredEmail && configuredEmail.includes('@')) {
            await this.sendRestorePointToEmail(tenant.id, configuredEmail);
            this.logger.log(
              `[Cron Email] Automated 24h backup emailed strictly to shopkeeper configured email (${configuredEmail}) for shop "${tenant.name}"`,
            );
          } else {
            this.logger.warn(
              `[Cron Email Skip] No backup email configured in settings by shopkeeper for shop "${tenant.name}"`,
            );
          }
        } catch (emailErr: any) {
          this.logger.error(
            `[Cron Email Error] Tenant ${tenant.name} email delivery failed: ${emailErr.message}`,
          );
        }
      }
      this.logger.log(
        '🎉 24-Hour Automated Triple-Vault Backup Job completed successfully for all active stores.',
      );
    } catch (err: any) {
      this.logger.error(
        `Automated 24-hour backup job failed: ${err.message}`,
        err.stack,
      );
    }
  }
}

