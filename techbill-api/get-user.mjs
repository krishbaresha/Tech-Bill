import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ take: 2 });
  console.log(users);
}
main().finally(() => prisma.$disconnect());
