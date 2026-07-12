/**
 * One-time backfill script: set Sale.status = 'partial_return'
 * for any sale that has at least one approved Return record
 * but still has status = 'completed'.
 *
 * Run with: node scripts/backfill-partial-returns.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find all distinct saleIds that have an approved return
  const approvedReturns = await prisma.return.findMany({
    where: { status: 'approved' },
    select: { saleId: true },
    distinct: ['saleId'],
  });

  const saleIds = approvedReturns.map(r => r.saleId).filter(Boolean);
  console.log(`Found ${saleIds.length} sale(s) with approved returns.`);

  if (saleIds.length === 0) {
    console.log('Nothing to backfill.');
    return;
  }

  // Only update ones that are still 'completed'
  const result = await prisma.sale.updateMany({
    where: {
      id: { in: saleIds },
      status: 'completed',
    },
    data: { status: 'partial_return' },
  });

  console.log(`Backfilled ${result.count} sale(s) to status = partial_return.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
