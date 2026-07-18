import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { SyncService } from './sync.service';
import { PushDto } from './dto/push.dto';

/**
 * Guards are imported from the existing app at merge time, exactly like the
 * licence controllers (TECH_STACK.md: reuse ThrottlerGuard/TenantGuard/etc.).
 */
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';

interface RequestWithUser extends Request {
  user: { id: string; tenantId: string; role: string };
}

/**
 * Delta sync endpoints (ARCHITECTURE.md §5). Called by the desktop app with
 * the logged-in user's JWT; every operation is scoped to the JWT's tenant —
 * the request body's own tenant claims are discarded by the service.
 */
@Controller('sync')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  async push(@Body() dto: PushDto, @Req() req: RequestWithUser) {
    return this.syncService.push(req.user.tenantId, dto.changes);
  }

  @Get('pull')
  async pull(
    @Query('since') since: string | undefined,
    @Req() req: RequestWithUser,
  ) {
    return this.syncService.pull(req.user.tenantId, since);
  }
}
