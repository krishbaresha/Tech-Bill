import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { ReturnsService } from './returns.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { ReviewReturnDto } from './dto/review-return.dto';
import { FilterReturnsDto } from './dto/filter-returns.dto';
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

@Controller('returns')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class ReturnsController {
  constructor(private returnsService: ReturnsService) {}

  @Get()
  @Permissions('returns.read')
  listReturns(@Query() filter: FilterReturnsDto, @Req() req: RequestWithUser) {
    return this.returnsService.listReturns(filter, req.user.tenantId);
  }

  @Get(':id')
  @Permissions('returns.read')
  getReturn(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.returnsService.getReturn(id, req.user.tenantId);
  }

  @Post()
  @Permissions('returns.create')
  @HttpCode(HttpStatus.CREATED)
  createReturn(@Body() dto: CreateReturnDto, @Req() req: RequestWithUser) {
    return this.returnsService.createReturn(
      dto,
      req.user.id,
      req.user.tenantId,
    );
  }

  @Patch(':id/approve')
  @Permissions('returns.review')
  @HttpCode(HttpStatus.OK)
  approveReturn(
    @Param('id') id: string,
    @Body() dto: ReviewReturnDto,
    @Req() req: RequestWithUser,
  ) {
    return this.returnsService.approveReturn(
      id,
      dto,
      req.user.id,
      req.user.tenantId,
    );
  }

  @Patch(':id/reject')
  @Permissions('returns.review')
  @HttpCode(HttpStatus.OK)
  rejectReturn(
    @Param('id') id: string,
    @Body() dto: ReviewReturnDto,
    @Req() req: RequestWithUser,
  ) {
    return this.returnsService.rejectReturn(
      id,
      dto,
      req.user.id,
      req.user.tenantId,
    );
  }
}
