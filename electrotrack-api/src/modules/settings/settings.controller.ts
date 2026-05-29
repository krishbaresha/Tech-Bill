import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

interface RequestWithUser extends Request {
  user: {
    id: string;
    tenantId: string;
    role: string;
    permissions: string[];
  };
}

@Controller('settings')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  @Permissions('settings.read')
  getSettings(@Req() req: RequestWithUser) {
    return this.settingsService.getSettings(req.user.tenantId);
  }

  @Patch()
  @Permissions('settings.manage')
  updateSettings(
    @Req() req: RequestWithUser,
    @Body()
    dto: {
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
    },
  ) {
    return this.settingsService.updateSettings(req.user.tenantId, dto);
  }
}
