import { Injectable, ForbiddenException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { FilterAuditLogsDto } from './dto/filter-audit-logs.dto';

export interface LogEntryInput {
  action: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  deviceInfo?: string;
  tenantId?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: LogEntryInput): Promise<void> {
    let resolvedTenantId = data.tenantId;

    // Automatically resolve tenantId if not provided but userId is present
    if (!resolvedTenantId && data.userId) {
      const u = await this.prisma.user.findUnique({
        where: { id: data.userId },
        select: { tenantId: true },
      });
      resolvedTenantId = u?.tenantId ?? undefined;
    }

    await this.prisma.auditLog.create({
      data: {
        action: data.action,
        userId: data.userId,
        entityType: data.entityType,
        entityId: data.entityId,
        ipAddress: data.ipAddress,
        deviceInfo: data.deviceInfo,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        oldValue: data.oldValue as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        newValue: data.newValue as any,
        tenantId: resolvedTenantId || null,
      },
    });
  }

  // Guard: audit logs are immutable — no UPDATE or DELETE paths exist.
  preventMutation(): never {
    throw new ForbiddenException('Audit logs are immutable');
  }

  async findAll(filter: FilterAuditLogsDto, tenantId: string) {
    const {
      userId,
      action,
      entityType,
      entityId,
      from,
      to,
      page = 1,
      limit = 50,
    } = filter;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      ...(userId && { userId }),
      ...(action && {
        action: { contains: action, mode: 'insensitive' as const },
      }),
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
      ...(from || to
        ? {
            createdAt: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to + 'T23:59:59.999Z') }),
            },
          }
        : {}),
    };

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data: logs, meta: { total, page, limit } };
  }

  async findByEntity(entityType: string, entityId: string, tenantId: string) {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId, tenantId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  @OnEvent('user.login')
  async onUserLogin(payload: {
    userId: string;
    ipAddress?: string;
    tenantId?: string;
  }) {
    await this.log({
      action: 'user.login',
      userId: payload.userId,
      entityType: 'user',
      entityId: payload.userId,
      ipAddress: payload.ipAddress,
      tenantId: payload.tenantId,
    });
  }

  @OnEvent('user.failed_login')
  async onFailedLogin(payload: { email: string; ipAddress?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: payload.email },
      select: { tenantId: true },
    });

    await this.log({
      action: 'user.failed_login',
      entityType: 'user',
      newValue: { email: payload.email },
      ipAddress: payload.ipAddress,
      tenantId: user?.tenantId ?? undefined,
    });
  }

  @OnEvent('sale.created')
  async onSaleCreated(payload: {
    id: string;
    cashierId: string;
    totalAmount: number;
    itemCount: number;
    paymentMethod: string;
    tenantId: string;
  }) {
    await this.log({
      action: 'sale.created',
      userId: payload.cashierId,
      entityType: 'sale',
      entityId: payload.id,
      newValue: {
        totalAmount: payload.totalAmount,
        itemCount: payload.itemCount,
        paymentMethod: payload.paymentMethod,
      },
      tenantId: payload.tenantId,
    });
  }

  @OnEvent('sale.voided')
  async onSaleVoided(payload: {
    id: string;
    userId: string;
    reason: string;
    tenantId: string;
  }) {
    await this.log({
      action: 'sale.voided',
      userId: payload.userId,
      entityType: 'sale',
      entityId: payload.id,
      newValue: { reason: payload.reason },
      tenantId: payload.tenantId,
    });
  }

  @OnEvent('inventory.unit_added')
  async onUnitAdded(payload: {
    unitId: string;
    userId: string;
    serialNumber: string;
    productId: string;
    tenantId: string;
  }) {
    await this.log({
      action: 'inventory.unit_added',
      userId: payload.userId,
      entityType: 'inventory_unit',
      entityId: payload.unitId,
      newValue: {
        serialNumber: payload.serialNumber,
        productId: payload.productId,
      },
      tenantId: payload.tenantId,
    });
  }

  @OnEvent('inventory.status_changed')
  async onUnitStatusChanged(payload: {
    unitId: string;
    userId: string;
    oldStatus: string;
    newStatus: string;
    tenantId: string;
  }) {
    await this.log({
      action: 'inventory.status_changed',
      userId: payload.userId,
      entityType: 'inventory_unit',
      entityId: payload.unitId,
      oldValue: { status: payload.oldStatus },
      newValue: { status: payload.newStatus },
      tenantId: payload.tenantId,
    });
  }

  @OnEvent('return.requested')
  async onReturnRequested(payload: {
    returnId: string;
    userId: string;
    saleId: string;
    reason: string;
    tenantId: string;
  }) {
    await this.log({
      action: 'return.requested',
      userId: payload.userId,
      entityType: 'return',
      entityId: payload.returnId,
      newValue: { saleId: payload.saleId, reason: payload.reason },
      tenantId: payload.tenantId,
    });
  }

  @OnEvent('return.approved')
  async onReturnApproved(payload: {
    returnId: string;
    userId: string;
    refundAmount?: number;
    tenantId: string;
  }) {
    await this.log({
      action: 'return.approved',
      userId: payload.userId,
      entityType: 'return',
      entityId: payload.returnId,
      newValue: { refundAmount: payload.refundAmount },
      tenantId: payload.tenantId,
    });
  }

  @OnEvent('return.rejected')
  async onReturnRejected(payload: {
    returnId: string;
    userId: string;
    reviewNotes: string;
    tenantId: string;
  }) {
    await this.log({
      action: 'return.rejected',
      userId: payload.userId,
      entityType: 'return',
      entityId: payload.returnId,
      newValue: { reviewNotes: payload.reviewNotes },
      tenantId: payload.tenantId,
    });
  }

  @OnEvent('discount.requested')
  async onDiscountRequested(payload: {
    saleId?: string;
    userId: string;
    amount: number;
    tenantId: string;
  }) {
    await this.log({
      action: 'discount.requested',
      userId: payload.userId,
      entityType: 'sale',
      entityId: payload.saleId,
      newValue: { amount: payload.amount },
      tenantId: payload.tenantId,
    });
  }

  @OnEvent('discount.approved')
  async onDiscountApproved(payload: {
    saleId?: string;
    userId: string;
    amount: number;
    tenantId: string;
  }) {
    await this.log({
      action: 'discount.approved',
      userId: payload.userId,
      entityType: 'sale',
      entityId: payload.saleId,
      newValue: { amount: payload.amount },
      tenantId: payload.tenantId,
    });
  }
}
