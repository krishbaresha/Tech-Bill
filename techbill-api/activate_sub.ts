import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.tenant.updateMany({
    data: {
      appAccessEnabled: true,
      status: 'active'
    }
  });
  console.log('Successfully activated app access subscription for all tenants:', result);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
