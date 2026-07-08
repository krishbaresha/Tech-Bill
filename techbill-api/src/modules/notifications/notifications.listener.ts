import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { Role } from '@prisma/client';

@Injectable()
export class NotificationsListener {
  constructor(
    private notifications: NotificationsService,
    private prisma: PrismaService,
  ) {}

  private async notifyOwners(
    tenantId: string,
    type: string,
    message: string,
    actionUrl?: string,
  ) {
    const owners = await this.prisma.user.findMany({
      where: { role: Role.owner, isActive: true, tenantId },
      select: { id: true },
    });
    await Promise.all(
      owners.map((u) =>
        this.notifications.create(u.id, type, message, actionUrl),
      ),
    );
  }

  @OnEvent('stock.low')
  async onStockLow(payload: {
    productName: string;
    stockCount: number;
    tenantId: string;
  }) {
    await this.notifyOwners(
      payload.tenantId,
      'stock_low',
      `Low stock: "${payload.productName}" has only ${payload.stockCount} unit(s) left`,
      '/inventory',
    );
  }

  @OnEvent('return.requested')
  async onReturnRequested(payload: {
    returnId: string;
    productName: string;
    requestedByName?: string;
    tenantId: string;
  }) {
    await this.notifyOwners(
      payload.tenantId,
      'return_requested',
      `Return request for "${payload.productName}"${payload.requestedByName ? ` by ${payload.requestedByName}` : ''} needs your review`,
      '/returns',
    );
  }

  @OnEvent('sale.created')
  async onSaleCreated(payload: {
    invoiceNumber: string;
    totalAmount: number;
    tenantId: string;
  }) {
    await this.notifyOwners(
      payload.tenantId,
      'sale_created',
      `Sale ${payload.invoiceNumber} completed — Rs ${Number(payload.totalAmount).toLocaleString()}`,
      '/dashboard',
    );
  }
}
