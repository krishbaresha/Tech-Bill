import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
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

@Controller('expenses')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Post()
  @Permissions('reports.read') // Assuming anyone who can read reports or do reconciliation can add expenses
  createExpense(@Body() dto: CreateExpenseDto, @Req() req: RequestWithUser) {
    return this.expensesService.createExpense(
      dto,
      req.user.id,
      req.user.tenantId,
    );
  }

  @Get()
  @Permissions('reports.read')
  listExpenses(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Req() req: RequestWithUser,
  ) {
    return this.expensesService.listExpenses(req.user.tenantId, from, to);
  }

  @Delete(':id')
  @Permissions('reports.read') // Adjust permission as necessary
  deleteExpense(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.expensesService.deleteExpense(id, req.user.tenantId);
  }
}
