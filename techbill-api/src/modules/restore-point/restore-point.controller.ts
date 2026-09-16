import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { RestorePointService } from './restore-point.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

interface RequestWithUser extends Request {
  user: {
    id: string;
    tenantId: string;
    email?: string;
    role: string;
    permissions: string[];
  };
}

interface CustomUploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('restore-point')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class RestorePointController {
  constructor(private restorePointService: RestorePointService) {}

  @Get('download')
  @Permissions('settings.manage')
  async downloadRestorePoint(
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ) {
    const { buffer, fileName } =
      await this.restorePointService.createRestorePoint(req.user.tenantId);

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': buffer.length.toString(),
    });

    res.end(buffer);
  }

  @Post('inspect')
  @Permissions('settings.manage')
  @UseInterceptors(FileInterceptor('file'))
  async inspectRestorePoint(@UploadedFile() file: CustomUploadedFile) {
    if (!file || !file.buffer) {
      throw new BadRequestException(
        'Please upload a valid .techbill restore point file.',
      );
    }
    return this.restorePointService.inspectRestorePoint(file.buffer);
  }

  @Post('apply')
  @Permissions('settings.manage')
  @UseInterceptors(FileInterceptor('file'))
  async applyRestorePoint(
    @Req() req: RequestWithUser,
    @UploadedFile() file: CustomUploadedFile,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException(
        'Please upload a valid .techbill restore point file.',
      );
    }
    return this.restorePointService.applyRestorePoint(
      req.user.tenantId,
      file.buffer,
    );
  }

  @Post('reset')
  @Permissions('settings.manage')
  async resetStore(@Req() req: RequestWithUser) {
    return this.restorePointService.resetTenantData(req.user.tenantId);
  }

  @Post('email')
  @Permissions('settings.manage')
  async sendBackupEmail(
    @Req() req: RequestWithUser,
    @Body('email') email?: string,
  ) {
    const recipientEmail = email || req.user.email;
    if (!recipientEmail) {
      throw new BadRequestException('Recipient email address is required.');
    }
    return this.restorePointService.sendRestorePointToEmail(
      req.user.tenantId,
      recipientEmail,
    );
  }
}
