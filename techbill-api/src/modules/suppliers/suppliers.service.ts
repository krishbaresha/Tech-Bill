import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { CreatePoDto } from './dto/create-po.dto';
import { ReceivePoDto } from './dto/receive-po.dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  // ─── Suppliers ────────────────────────────────────────────────────────────────

  listSuppliers(search: string | undefined, tenantId: string) {
    return this.prisma.supplier.findMany({
      where: {
        tenantId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { contactName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
              ],
            }
          : {}),
      },
      include: { _count: { select: { purchaseOrders: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async getSupplier(id: string, tenantId: string) {
    const s = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
      include: {
        purchaseOrders: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { _count: { select: { items: true } } },
        },
      },
    });
    if (!s) throw new NotFoundException(`Supplier ${id} not found`);
    return s;
  }

  createSupplier(dto: CreateSupplierDto, tenantId: string) {
    return this.prisma.supplier.create({
      data: {
        ...dto,
        tenantId,
      },
    });
  }

  async updateSupplier(
    id: string,
    dto: Partial<CreateSupplierDto>,
    tenantId: string,
  ) {
    await this.getSupplier(id, tenantId);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  // ─── Purchase Orders ──────────────────────────────────────────────────────────

  listPurchaseOrders(supplierId: string | undefined, tenantId: string) {
    return this.prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        ...(supplierId && { supplierId }),
      },
      include: {
        supplier: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { items: true } },
        items: {
          include: { product: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getPurchaseOrder(id: string, tenantId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: {
        supplier: true,
        items: {
          include: {
            product: { select: { id: true, name: true, brand: true } },
          },
        },
        grns: {
          include: {
            receivedBy: { select: { id: true, name: true } },
            _count: { select: { inventoryUnits: true } },
          },
        },
      },
    });
    if (!po) throw new NotFoundException(`Purchase order ${id} not found`);
    return po;
  }

  async createPurchaseOrder(
    dto: CreatePoDto,
    userId: string,
    tenantId: string,
  ) {
    const totalAmount = dto.items.reduce(
      (sum, item) => sum + item.quantityOrdered * item.unitCostPrice,
      0,
    );

    // Auto-create supplier if name is given but no ID
    let supplierId = dto.supplierId;
    if (!supplierId && dto.newSupplierName?.trim()) {
      const newSupplier = await this.prisma.supplier.create({
        data: { name: dto.newSupplierName.trim(), tenantId },
      });
      supplierId = newSupplier.id;
    }

    return this.prisma.purchaseOrder.create({
      data: {
        supplierId,
        notes: dto.notes,
        createdById: userId,
        totalAmount,
        tenantId,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            quantityOrdered: item.quantityOrdered,
            unitCostPrice: item.unitCostPrice,
          })),
        },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
      },
    });
  }

  /**
   * Mark a Purchase Order as received.
   */
  async receivePurchaseOrder(
    id: string,
    dto: ReceivePoDto,
    userId: string,
    tenantId: string,
  ) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });
    if (!po) throw new NotFoundException(`Purchase order ${id} not found`);
    if (po.status === 'received') {
      throw new BadRequestException(
        'Purchase order is already marked as received',
      );
    }
    if (po.status === 'cancelled') {
      throw new BadRequestException(
        'Cannot receive a cancelled purchase order',
      );
    }

    const now = new Date();
    const ts = Date.now();

    return this.prisma.$transaction(async (tx) => {
      // Create inventory units for each item
      const newUnits: any[] = [];
      let snIndex = 0;

      for (const item of po.items) {
        if (dto.snGenerationMethod === 'manual') {
          const manualItem = dto.items?.find(
            (i) => i.productId === item.productId,
          );
          const serialNumbers = manualItem?.serialNumbers || [];
          if (serialNumbers.length !== item.quantityOrdered) {
            throw new BadRequestException(
              `Expected ${item.quantityOrdered} serial numbers for product ${item.productId}, but got ${serialNumbers.length}`,
            );
          }
          for (const sn of serialNumbers) {
            newUnits.push({
              tenantId,
              productId: item.productId,
              serialNumber: sn,
              purchasePrice: item.unitCostPrice,
              status: 'in_stock',
              condition: 'new',
              notes: `Received from PO ${po.id.slice(-8).toUpperCase()}`,
            });
          }
        } else {
          // Auto-generate
          for (let i = 0; i < item.quantityOrdered; i++) {
            snIndex++;
            newUnits.push({
              tenantId,
              productId: item.productId,
              serialNumber: `AUTOSN-${ts}-${snIndex}`,
              purchasePrice: item.unitCostPrice,
              status: 'in_stock',
              condition: 'new',
              notes: `Received from PO ${po.id.slice(-8).toUpperCase()}`,
            });
          }
        }
      }

      if (newUnits.length > 0) {
        // Prisma createMany does not return the created records, but that's fine
        // If there's a unique constraint violation on SNs, it will throw
        try {
          await tx.inventoryUnit.createMany({
            data: newUnits,
            skipDuplicates: false,
          });
        } catch (error: any) {
          if (error.code === 'P2002') {
            throw new BadRequestException(
              'One or more serial numbers already exist in the inventory.',
            );
          }
          throw error;
        }
      }

      // Mark PO as received
      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: { status: 'received' },
        include: {
          supplier: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true } } } },
        },
      });



      return updated;
    });
  }

  async updatePurchaseOrderPayment(
    id: string,
    data: { paidAmount?: number; paymentMethod?: string },
    tenantId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id, tenantId },
        include: { creditRecord: true },
      });
      if (!po) throw new NotFoundException(`Purchase order ${id} not found`);

      const totalAmount = po.totalAmount ? Number(po.totalAmount) : 0;
      const newPaidAmount = data.paidAmount !== undefined ? data.paidAmount : (po.paidAmount ? Number(po.paidAmount) : 0);
      const newCreditAmount = totalAmount - newPaidAmount;

      // Update PO
      const updatedPo = await tx.purchaseOrder.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          paymentMethod: data.paymentMethod !== undefined ? data.paymentMethod : po.paymentMethod,
        },
      });

      // Update CreditRecord if it exists
      if (po.creditRecordId) {
        if (newCreditAmount <= 0) {
          await tx.creditRecord.update({
            where: { id: po.creditRecordId },
            data: { dueAmount: 0, paidAmount: totalAmount, status: 'PAID' },
          });
        } else {
          await tx.creditRecord.update({
            where: { id: po.creditRecordId },
            data: { dueAmount: newCreditAmount, paidAmount: newPaidAmount },
          });
        }
      } else if (newCreditAmount > 0 && po.supplierId) {
        const newCredit = await tx.creditRecord.create({
          data: {
            type: 'SUPPLIER',
            status: 'PENDING',
            amount: totalAmount,
            paidAmount: newPaidAmount,
            dueAmount: newCreditAmount,
            description: `Credit for Purchase Order (Updated)`,
            date: new Date(),
            supplierId: po.supplierId,
            tenantId,
          },
        });
        await tx.purchaseOrder.update({
          where: { id },
          data: { creditRecordId: newCredit.id },
        });
      }

      return updatedPo;
    });
  }

  async deletePurchaseOrder(id: string, tenantId: string) {
    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id, tenantId },
        include: { grns: { include: { inventoryUnits: true } } },
      });
      if (!po) throw new NotFoundException(`Purchase order ${id} not found`);

      // Check if created within last 24 hours
      const now = new Date();
      const createdAt = new Date(po.createdAt);
      const diffHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      if (diffHours > 24) {
        throw new BadRequestException('Cannot delete purchase orders older than 24 hours');
      }

      // Reverse stock (delete inventory units from GRNs)
      const unitIdsToDelete: string[] = [];
      const grnIdsToDelete: string[] = [];
      for (const grn of po.grns) {
        grnIdsToDelete.push(grn.id);
        for (const unit of grn.inventoryUnits) {
          unitIdsToDelete.push(unit.id);
        }
      }

      if (unitIdsToDelete.length > 0) {
        await tx.inventoryUnit.deleteMany({
          where: { id: { in: unitIdsToDelete }, tenantId },
        });
      }

      if (grnIdsToDelete.length > 0) {
        await tx.goodsReceivedNote.deleteMany({
          where: { id: { in: grnIdsToDelete } },
        });
      }

      const deletedPo = await tx.purchaseOrder.delete({
        where: { id },
      });

      // If there was a credit record, we could delete it, but Prisma will cascade if configured or we delete manually
      if (po.creditRecordId) {
        await tx.creditRecord.delete({ where: { id: po.creditRecordId } }).catch(() => {});
      }

      return deletedPo;
    });
  }
}
