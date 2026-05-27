import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(tenantId: string) {
    let settings = await this.prisma.shopSettings.findFirst({
      where: { tenantId },
    });

    if (!settings) {
      // Fallback: create settings if missing
      settings = await this.prisma.shopSettings.create({
        data: {
          tenantId,
          shopName: 'My Shop',
          lowStockThreshold: 2,
          deadStockDays: 60,
          maxDiscountWithoutOtp: 500,
          returnFraudWindowDays: 30,
          returnFraudCountThreshold: 2,
        },
      });
    }

    return settings;
  }

  async updateSettings(
    tenantId: string,
    dto: {
      shopName?: string;
      lowStockThreshold?: number;
      deadStockDays?: number;
      maxDiscountWithoutOtp?: number;
      returnFraudWindowDays?: number;
      returnFraudCountThreshold?: number;
    },
  ) {
    const settings = await this.getSettings(tenantId);

    return this.prisma.shopSettings.update({
      where: { id: settings.id },
      data: dto,
    });
  }
}
