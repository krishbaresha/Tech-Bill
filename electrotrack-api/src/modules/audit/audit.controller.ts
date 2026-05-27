import { Controller, Get, Param, Query, Res, UseGuards, Req } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuditService } from './audit.service';
import { FilterAuditLogsDto } from './dto/filter-audit-logs.dto';
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

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @Permissions('audit.read')
  findAll(@Query() filter: FilterAuditLogsDto, @Req() req: RequestWithUser) {
    return this.auditService.findAll(filter, req.user.tenantId);
  }

  @Get('export')
  @Permissions('audit.read')
  async exportCsv(
    @Query() filter: FilterAuditLogsDto,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ) {
    const { data } = await this.auditService.findAll(
      {
        ...filter,
        limit: 10000,
      },
      req.user.tenantId,
    );
    const header = 'id,action,entityType,entityId,userId,ipAddress,createdAt\n';
    const rows = data
      .map(
        (l) =>
          `${l.id},${l.action},${l.entityType ?? ''},${l.entityId ?? ''},${l.userId ?? ''},${l.ipAddress ?? ''},${l.createdAt.toISOString()}`,
      )
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="audit-logs.csv"',
    );
    return res.send(header + rows);
  }

  @Get('entity/:entityType/:entityId')
  @Permissions('audit.read')
  findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.auditService.findByEntity(entityType, entityId, req.user.tenantId);
  }
}
