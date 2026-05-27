import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { BulkCreateUnitsDto } from './dto/bulk-create-units.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { FilterUnitsDto } from './dto/filter-units.dto';
import { UnitStatus } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // ─── Products ────────────────────────────────────────────────────────────────

  async listProducts(tenantId: string) {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, tenantId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            inventoryUnits: { where: { status: UnitStatus.in_stock, tenantId } },
          },
        },
      },
    });

    return products.map((p) => ({
      ...p,
      stockCount: p._count.inventoryUnits,
      _count: undefined,
    }));
  }

  async createProduct(dto: CreateProductDto, userId: string, tenantId: string) {
    return this.prisma.product.create({
      data: {
        name: dto.name,
        brand: dto.brand,
        category: dto.category,
        description: dto.description,
        sellingPrice: dto.sellingPrice,
        costPrice: dto.costPrice,
        warrantyMonths: dto.warrantyMonths ?? 0,
        createdById: userId,
        tenantId,
      },
    });
  }

  async updateProduct(id: string, dto: UpdateProductDto, tenantId: string) {
    await this.findProductOrThrow(id, tenantId);
    return this.prisma.product.update({ where: { id }, data: { ...dto } });
  }

  async getProduct(id: string, tenantId: string) {
    const product = await this.findProductOrThrow(id, tenantId);
    const stockCount = await this.prisma.inventoryUnit.count({
      where: { productId: id, status: UnitStatus.in_stock, tenantId },
    });
    return { ...product, stockCount };
  }

  private async findProductOrThrow(id: string, tenantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  // ─── Units ───────────────────────────────────────────────────────────────────

  async listUnits(filter: FilterUnitsDto, tenantId: string) {
    const { status, productId, condition, page = 1, limit = 50 } = filter;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      ...(status && { status }),
      ...(productId && { productId }),
      ...(condition && { condition }),
    };

    const [units, total] = await this.prisma.$transaction([
      this.prisma.inventoryUnit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { receivedAt: 'desc' },
        include: {
          product: {
            select: { id: true, name: true, brand: true, sellingPrice: true },
          },
        },
      }),
      this.prisma.inventoryUnit.count({ where }),
    ]);

    return { data: units, meta: { total, page, limit } };
  }

  async lookupBySerial(serialNumber: string, tenantId: string) {
    const unit = await this.prisma.inventoryUnit.findUnique({
      where: {
        tenantId_serialNumber: {
          tenantId,
          serialNumber,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            brand: true,
            category: true,
            sellingPrice: true,
            warrantyMonths: true,
          },
        },
      },
    });

    if (!unit)
      throw new NotFoundException(`Serial number "${serialNumber}" not found`);

    if (unit.status !== UnitStatus.in_stock) {
      throw new BadRequestException(
        `Unit "${serialNumber}" is not available — current status: ${unit.status}`,
      );
    }

    return unit;
  }

  async createUnit(dto: CreateUnitDto, tenantId: string) {
    const existing = await this.prisma.inventoryUnit.findUnique({
      where: {
        tenantId_serialNumber: {
          tenantId,
          serialNumber: dto.serialNumber,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        `Serial number "${dto.serialNumber}" already exists`,
      );
    }

    await this.findProductOrThrow(dto.productId, tenantId);

    return this.prisma.inventoryUnit.create({
      data: {
        serialNumber: dto.serialNumber,
        productId: dto.productId,
        condition: dto.condition,
        purchasePrice: dto.purchasePrice,
        notes: dto.notes,
        grnId: dto.grnId,
        tenantId,
      },
      include: {
        product: { select: { id: true, name: true, sellingPrice: true } },
      },
    });
  }

  async bulkCreateUnits(dto: BulkCreateUnitsDto, tenantId: string) {
    const serials = dto.units.map((u) => u.serialNumber);
    const duplicates = serials.filter((s, i) => serials.indexOf(s) !== i);
    if (duplicates.length > 0) {
      throw new BadRequestException(
        `Duplicate serials in request: ${duplicates.join(', ')}`,
      );
    }

    const existing = await this.prisma.inventoryUnit.findMany({
      where: {
        tenantId,
        serialNumber: { in: serials },
      },
      select: { serialNumber: true },
    });
    if (existing.length > 0) {
      throw new ConflictException(
        `Serial numbers already exist: ${existing.map((e) => e.serialNumber).join(', ')}`,
      );
    }

    await this.prisma.inventoryUnit.createMany({
      data: dto.units.map((u) => ({
        serialNumber: u.serialNumber,
        productId: u.productId,
        condition: u.condition,
        purchasePrice: u.purchasePrice,
        notes: u.notes,
        grnId: u.grnId,
        tenantId,
      })),
    });

    return { created: dto.units.length };
  }

  async updateUnit(id: string, dto: UpdateUnitDto, tenantId: string) {
    const unit = await this.prisma.inventoryUnit.findFirst({
      where: { id, tenantId },
    });
    if (!unit) throw new NotFoundException(`Unit ${id} not found`);

    return this.prisma.inventoryUnit.update({
      where: { id },
      data: { ...dto },
      include: {
        product: { select: { id: true, name: true, sellingPrice: true } },
      },
    });
  }

  async softDeleteProduct(id: string, tenantId: string) {
    await this.findProductOrThrow(id, tenantId);
    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
    return { message: 'Product deactivated' };
  }

  // ─── Suppliers ───────────────────────────────────────────────────────────────

  async listSuppliers(tenantId: string) {
    return this.prisma.supplier.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async createSupplier(
    data: {
      name: string;
      contactName?: string;
      phone?: string;
      email?: string;
      address?: string;
    },
    tenantId: string,
  ) {
    return this.prisma.supplier.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  // ─── Purchase Orders ─────────────────────────────────────────────────────────

  async listPurchaseOrders(tenantId: string) {
    return this.prisma.purchaseOrder.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    });
  }

  async createPurchaseOrder(
    data: {
      supplierId?: string;
      notes?: string;
      items: {
        productId: string;
        quantityOrdered: number;
        unitCostPrice: number;
      }[];
    },
    userId: string,
    tenantId: string,
  ) {
    const totalAmount = data.items.reduce(
      (sum, i) => sum + i.quantityOrdered * i.unitCostPrice,
      0,
    );

    return this.prisma.purchaseOrder.create({
      data: {
        supplierId: data.supplierId,
        notes: data.notes,
        totalAmount,
        createdById: userId,
        tenantId,
        items: { create: data.items },
      },
      include: { items: true, supplier: true },
    });
  }

  // ─── Goods Received Notes ─────────────────────────────────────────────────────

  async getGrn(id: string, tenantId: string) {
    const grn = await this.prisma.goodsReceivedNote.findFirst({
      where: { id, tenantId },
      include: {
        inventoryUnits: {
          include: { product: { select: { id: true, name: true } } },
        },
        receivedBy: { select: { id: true, name: true } },
        purchaseOrder: { select: { id: true } },
      },
    });
    if (!grn) throw new NotFoundException(`GRN ${id} not found`);
    return grn;
  }

  async createGrn(
    data: {
      purchaseOrderId?: string;
      notes?: string;
      units: {
        serialNumber: string;
        productId: string;
        purchasePrice?: number;
      }[];
    },
    userId: string,
    tenantId: string,
  ) {
    const serials = data.units.map((u) => u.serialNumber);
    const existing = await this.prisma.inventoryUnit.findMany({
      where: {
        tenantId,
        serialNumber: { in: serials },
      },
      select: { serialNumber: true },
    });
    if (existing.length > 0) {
      throw new ConflictException(
        `Serial numbers already exist: ${existing.map((e) => e.serialNumber).join(', ')}`,
      );
    }

    return this.prisma.goodsReceivedNote.create({
      data: {
        purchaseOrderId: data.purchaseOrderId,
        receivedById: userId,
        notes: data.notes,
        tenantId,
        inventoryUnits: {
          create: data.units.map((u) => ({
            serialNumber: u.serialNumber,
            productId: u.productId,
            purchasePrice: u.purchasePrice,
            status: UnitStatus.in_stock,
            tenantId,
          })),
        },
      },
      include: {
        inventoryUnits: {
          include: { product: { select: { id: true, name: true } } },
        },
      },
    });
  }
}
