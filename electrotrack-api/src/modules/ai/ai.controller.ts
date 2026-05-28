import {
  Controller,
  Get,
  Req,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PrismaService } from '../../prisma/prisma.service';

interface RequestWithUser extends Request {
  user: { id: string; tenantId: string; role: string; permissions: string[] };
}

@Controller('ai')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('insights')
  @Permissions('reports.read')
  async getInsights(@Req() req: RequestWithUser) {
    const tenantId = req.user.tenantId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const [salesToday, returnsToday, lowStockProducts] = await Promise.all([
        this.prisma.sale.findMany({
          where: { tenantId, createdAt: { gte: today }, status: 'completed' },
          include: { items: true },
        }),
        this.prisma.return.count({
          where: { tenantId, createdAt: { gte: today } },
        }),
        this.prisma.product.findMany({
          where: { tenantId, isActive: true },
          include: {
            _count: {
              select: { inventoryUnits: { where: { status: 'in_stock' } } },
            },
          },
        }),
      ]);

      const totalRevenue = salesToday.reduce(
        (s, sale) => s + Number(sale.totalAmount),
        0,
      );

      const threshold = 2;
      const lowStockCount = lowStockProducts.filter(
        (p) => p._count.inventoryUnits <= threshold,
      ).length;

      const insight = await this.aiService.generateInsights({
        totalSalesToday: salesToday.length,
        totalRevenue,
        lowStockCount,
        totalReturnsToday: returnsToday,
      });

      return { insight, generatedAt: new Date().toISOString() };
    } catch {
      throw new HttpException(
        'AI insights unavailable. Check GROK_API_KEY configuration.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
