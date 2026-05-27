import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { NotificationsService } from './notifications.service';
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

@Controller('notifications')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @Permissions('notifications.read')
  list(@Req() req: RequestWithUser) {
    return this.notificationsService.listForUser(req.user.id, req.user.tenantId);
  }

  @Patch('read-all')
  @Permissions('notifications.manage')
  @HttpCode(HttpStatus.OK)
  markAllRead(@Req() req: RequestWithUser) {
    return this.notificationsService.markAllRead(req.user.id, req.user.tenantId);
  }

  @Patch(':id/read')
  @Permissions('notifications.manage')
  @HttpCode(HttpStatus.OK)
  markRead(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.notificationsService.markRead(id, req.user.id, req.user.tenantId);
  }
}
