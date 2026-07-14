import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CreditService } from './credit.service';
import { CreateCreditDto } from './dto/create-credit.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CreditType, CreditStatus } from '@prisma/client';

interface RequestWithUser extends Request {
  user: {
    id: string;
    tenantId: string;
    role: string;
    permissions: string[];
  };
}

@Controller('credit')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class CreditController {
  constructor(private creditService: CreditService) {}

  @Post()
  @Permissions('reports.read')
  createCredit(@Body() dto: CreateCreditDto, @Req() req: RequestWithUser) {
    return this.creditService.createCredit(dto, req.user.tenantId);
  }

  @Get()
  @Permissions('reports.read')
  listCredits(
    @Query('type') type: CreditType | undefined,
    @Query('status') status: CreditStatus | undefined,
    @Req() req: RequestWithUser,
  ) {
    return this.creditService.listCredits(req.user.tenantId, type, status);
  }

  @Patch(':id/payment')
  @Permissions('reports.read')
  recordPayment(
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.creditService.recordPayment(id, dto, req.user.tenantId);
  }

  @Delete(':id')
  @Permissions('reports.read')
  deleteCredit(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.creditService.deleteCredit(id, req.user.tenantId);
  }
}
