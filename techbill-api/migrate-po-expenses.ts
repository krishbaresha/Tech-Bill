import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration of PO Expenses...');
  
  const poExpenses = await prisma.expense.findMany({
    where: { category: 'purchase_order' }
  });

  console.log(`Found ${poExpenses.length} PO Expenses.`);

  for (const expense of poExpenses) {
    // Description format: Purchase Order received (PO: C8F74106)
    const match = expense.description?.match(/\(PO:\s*([A-F0-9]+)\)/i);
    if (!match) {
      console.log(`Skipping expense ${expense.id} - no PO ref found in description: ${expense.description}`);
      continue;
    }

    const ref = match[1];
    
    // Find all POs and filter by endsWith(ref) in JS since id is UUID in DB
    const allPos = await prisma.purchaseOrder.findMany();
    const poList = allPos.filter(p => p.id.toLowerCase().endsWith(ref.toLowerCase()));

    if (poList.length === 0) {
      console.log(`Warning: PO ref ${ref} not found for expense ${expense.id}. Skipping...`);
      continue;
    }

    const po = poList[0];
    console.log(`Migrating PO ${po.id} (ref ${ref}) -> Amount: ${expense.amount}`);

    // Update PO
    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: {
        paidAmount: expense.amount,
        paymentMethod: 'cash'
      }
    });

    // Delete the expense
    await prisma.expense.delete({
      where: { id: expense.id }
    });
  }

  console.log('Migration completed.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
