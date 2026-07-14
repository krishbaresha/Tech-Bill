const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== LIVE DATABASE REPORT ===\n');
  
  const tenantsCount = await prisma.tenant.count();
  const usersCount = await prisma.user.count();
  const productsCount = await prisma.product.count();
  const unitsCount = await prisma.inventoryUnit.count();
  const salesCount = await prisma.sale.count();
  const returnsCount = await prisma.return.count();
  const expensesCount = await prisma.expense.count();
  const auditLogsCount = await prisma.auditLog.count();
  const poCount = await prisma.purchaseOrder.count();

  console.log(`Tenants Count         : ${tenantsCount}`);
  console.log(`Users Count           : ${usersCount}`);
  console.log(`Products Count        : ${productsCount}`);
  console.log(`Inventory Units Count : ${unitsCount}`);
  console.log(`Sales Count           : ${salesCount}`);
  console.log(`Returns Count         : ${returnsCount}`);
  console.log(`Expenses Count        : ${expensesCount}`);
  console.log(`Audit Logs Count      : ${auditLogsCount}`);
  console.log(`Purchase Orders Count : ${poCount}`);
  
  console.log('\n=== TENANTS LIST ===');
  const tenants = await prisma.tenant.findMany();
  tenants.forEach(t => {
    console.log(`- ${t.name} (slug: ${t.slug}) | Status: ${t.status} | Plan: ${t.plan}`);
  });

  console.log('\n=== RECENT SALES ===');
  const recentSales = await prisma.sale.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { tenant: true }
  });
  recentSales.forEach(s => {
    console.log(`- Invoice: ${s.invoiceNumber} | Total: ${s.totalAmount} | Tenant: ${s.tenant?.name ?? 'Unknown'} | Date: ${s.createdAt}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
