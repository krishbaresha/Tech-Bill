const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.sale.findFirst({where: {invoiceNumber: 'INV-20260712-H08ORB'}}).then(console.log).finally(() => prisma.$disconnect());
