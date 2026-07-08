import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async createExpense(dto: CreateExpenseDto, userId: string, tenantId: string) {
    return this.prisma.expense.create({
      data: {
        amount: dto.amount,
        category: dto.category,
        description: dto.description,
        date: new Date(dto.date),
        createdById: userId,
        tenantId,
      },
    });
  }

  async listExpenses(tenantId: string, from?: string, to?: string) {
    const start = from ? new Date(from + 'T00:00:00+05:00') : undefined;
    const end = to ? new Date(to + 'T23:59:59+05:00') : undefined;
    const dateFilter = start || end ? { gte: start, lte: end } : undefined;

    return this.prisma.expense.findMany({
      where: {
        tenantId,
        ...(dateFilter && { date: dateFilter }),
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async deleteExpense(id: string, tenantId: string) {
    return this.prisma.expense.delete({
      where: { id, tenantId },
    });
  }
}
