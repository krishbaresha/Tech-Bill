const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const start = new Date(today + 'T00:00:00+05:00');
  const end = new Date(today + 'T23:59:59+05:00');
  console.log('start', start, 'end', end);
  const sales = await prisma.sale.findMany({ where: { createdAt: { gte: start, lte: end } } });
  console.log('Total sales today:', sales.length);
}
main().finally(() => prisma.$disconnect());
