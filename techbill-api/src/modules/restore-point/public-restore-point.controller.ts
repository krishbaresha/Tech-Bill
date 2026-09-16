import {
  Controller,
  Get,
  Query,
  Res,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { RestorePointService } from './restore-point.service';
import * as crypto from 'crypto';

const RESTORE_SECRET =
  process.env.JWT_SECRET || 'TechBill-Secure-Restore-Signature-Secret-2026';

@Controller('public-restore')
export class PublicRestorePointController {
  constructor(private restorePointService: RestorePointService) {}

  @Get('download')
  async publicDownload(
    @Query('tenantId') tenantId: string,
    @Query('expires') expiresStr: string,
    @Query('sig') sig: string,
    @Res() res: Response,
  ) {
    if (!tenantId || !expiresStr || !sig) {
      throw new BadRequestException(
        'Invalid download link parameter signature.',
      );
    }

    const expires = parseInt(expiresStr, 10);
    if (isNaN(expires) || Date.now() > expires) {
      throw new UnauthorizedException(
        'This backup download link has expired. Please trigger a new backup from TechBill POS.',
      );
    }

    const expectedSig = crypto
      .createHmac('sha256', RESTORE_SECRET)
      .update(`${tenantId}:${expiresStr}`)
      .digest('hex');

    if (sig !== expectedSig) {
      throw new UnauthorizedException(
        'Invalid cryptographic signature for backup download link.',
      );
    }

    const { buffer, fileName } =
      await this.restorePointService.createRestorePoint(tenantId);

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': buffer.length.toString(),
    });

    res.end(buffer);
  }
}
