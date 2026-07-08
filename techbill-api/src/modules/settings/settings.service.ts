import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface UpdateSettingsDto {
  shopName?: string;
  lowStockThreshold?: number;
  deadStockDays?: number;
  maxDiscountWithoutOtp?: number;
  returnFraudWindowDays?: number;
  returnFraudCountThreshold?: number;
  logoUrl?: string | null;
  invoiceFontFamily?: string;
  invoicePrimaryColor?: string;
  invoiceAccentColor?: string;
  invoiceFooterNotes?: string | null;
  invoiceWatermarkText?: string | null;
  invoiceShowWatermark?: boolean;
}

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(tenantId: string) {
    let settings = await this.prisma.shopSettings.findFirst({
      where: { tenantId },
      include: { tenant: { select: { onlineSellingEnabled: true } } },
    });

    if (!settings) {
      await this.prisma.shopSettings.create({
        data: {
          tenantId,
          shopName: 'My Shop',
          lowStockThreshold: 2,
          deadStockDays: 60,
          maxDiscountWithoutOtp: 500,
          returnFraudWindowDays: 30,
          returnFraudCountThreshold: 2,
          invoiceFontFamily: 'Inter',
          invoicePrimaryColor: '#ffffff',
          invoiceAccentColor: '#14b8a6',
          invoiceShowWatermark: false,
        },
      });
      settings = await this.prisma.shopSettings.findFirst({
        where: { tenantId },
        include: { tenant: { select: { onlineSellingEnabled: true } } },
      });
    }

    return {
      ...settings,
      onlineSellingEnabled: settings?.tenant?.onlineSellingEnabled ?? false,
    };
  }

  async updateSettings(tenantId: string, dto: UpdateSettingsDto) {
    const settings = await this.getSettings(tenantId);
    return this.prisma.shopSettings.update({
      where: { id: settings.id },
      data: dto,
    });
  }
}
