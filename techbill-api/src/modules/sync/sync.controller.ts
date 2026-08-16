import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { SyncService } from './sync.service';
import { PushDto } from './dto/push.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';

const MIN_SUPPORTED_SCHEMA_VERSION = '1.0.0';
const MAX_PUSH_BATCH_SIZE = 100;

interface RequestWithUser extends Request {
  user: { id: string; tenantId: string; role: string };
}

@Controller('sync')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  async push(
    @Body() dto: PushDto,
    @Req() req: RequestWithUser,
    @Headers('x-app-schema-version') schemaVersion?: string,
  ) {
    this.validateSchemaVersion(schemaVersion);

    if (dto.changes.length > MAX_PUSH_BATCH_SIZE) {
      throw new BadRequestException(
        `push batch size exceeds limit of ${MAX_PUSH_BATCH_SIZE} items. Received ${dto.changes.length}`,
      );
    }

    return this.syncService.push(req.user.tenantId, dto.changes);
  }

  @Get('pull')
  async pull(
    @Query('since') since: string | undefined,
    @Req() req: RequestWithUser,
    @Headers('x-app-schema-version') schemaVersion?: string,
  ) {
    this.validateSchemaVersion(schemaVersion);
    return this.syncService.pull(req.user.tenantId, since);
  }

  private validateSchemaVersion(version?: string): void {
    if (version && version < MIN_SUPPORTED_SCHEMA_VERSION) {
      throw new BadRequestException(
        `outdated app schema version '${version}'. Minimum required version is '${MIN_SUPPORTED_SCHEMA_VERSION}'`,
      );
    }
  }
}

