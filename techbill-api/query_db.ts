import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany();
  console.log('--- TENANTS ---');
  console.log(tenants);

  const users = await prisma.user.findMany();
  console.log('--- USERS ---');
  console.log(users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, tenantId: u.tenantId })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
