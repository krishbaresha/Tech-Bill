import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async listForUser(userId: string, tenantId: string) {
    const [notifications, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where: { userId, tenantId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.notification.count({ where: { userId, tenantId, isRead: false } }),
    ]);
    return { notifications, unreadCount };
  }

  async markRead(id: string, userId: string, tenantId: string) {
    const n = await this.prisma.notification.findFirst({ where: { id, userId, tenantId } });
    if (!n)
      throw new NotFoundException(`Notification ${id} not found`);
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string, tenantId: string) {
    const { count } = await this.prisma.notification.updateMany({
      where: { userId, tenantId, isRead: false },
      data: { isRead: true },
    });
    return { updated: count };
  }

  async create(
    userId: string,
    type: string,
    message: string,
    actionUrl?: string,
    tenantId?: string,
  ) {
    let resolvedTenantId = tenantId;
    if (!resolvedTenantId) {
      const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { tenantId: true } });
      resolvedTenantId = u?.tenantId ?? undefined;
    }

    return this.prisma.notification.create({
      data: {
        userId,
        type,
        message,
        actionUrl,
        tenantId: resolvedTenantId,
      },
    });
  }
}
