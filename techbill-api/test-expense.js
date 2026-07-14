const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const expenses = await prisma.expense.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log("Recent Expenses:");
  expenses.forEach(e => {
    console.log(`ID: ${e.id}, Date: ${e.date.toISOString()}, Amount: ${e.amount}, Desc: ${e.description}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
