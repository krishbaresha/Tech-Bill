import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

// ─── Permission Presets ─────────────────────────────────────────────────────

const ALL_PERMISSIONS = [
  'pos.read', 'pos.sell', 'pos.discount', 'pos.void',
  'inventory.read', 'inventory.write', 'inventory.delete',
  'suppliers.read', 'suppliers.write',
  'customers.read', 'customers.write',
  'returns.read', 'returns.create', 'returns.review',
  'reports.read', 'reports.cash_reconciliation',
  'users.read', 'users.manage', 'users.permissions',
  'settings.read', 'settings.manage',
  'audit.read', 'notifications.read', 'notifications.manage',
  'warranty.read', 'loyalty.read', 'loyalty.manage',
];

const CASHIER_PERMISSIONS = [
  'pos.read', 'pos.sell',
  'inventory.read',
  'customers.read', 'customers.write',
  'returns.read', 'returns.create',
  'notifications.read',
];

const INVENTORY_MANAGER_PERMISSIONS = [
  'inventory.read', 'inventory.write',
  'suppliers.read', 'suppliers.write',
  'customers.read',
  'returns.read',
  'reports.read',
  'notifications.read',
];

const TECHNICIAN_PERMISSIONS = [
  'inventory.read',
  'warranty.read',
  'notifications.read',
];

// ─── Main Seed ──────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding ElectroTrack multi-tenant database...');

  // 1. Platform Admin (no tenantId)
  const platformAdminHash = await bcrypt.hash('platform@123', BCRYPT_ROUNDS);
  const platformAdmin = await prisma.user.upsert({
    where: { email: 'admin@electrotrack.io' },
    update: {},
    create: {
      name: 'Platform Admin',
      email: 'admin@electrotrack.io',
      passwordHash: platformAdminHash,
      role: Role.platform_admin,
      tenantId: null,
      permissions: [],
    },
  });
  console.log(`  ✅ Platform Admin: ${platformAdmin.email}`);

  // ─── Tenant A: Alpha Electronics ────────────────────────────────────────

  const tenantA = await prisma.tenant.upsert({
    where: { slug: 'alpha-electronics' },
    update: {},
    create: {
      name: 'Alpha Electronics',
      slug: 'alpha-electronics',
      status: 'active',
      plan: 'standard',
      maxUsers: 10,
    },
  });
  console.log(`  ✅ Tenant A: ${tenantA.name} (${tenantA.slug})`);

  // Tenant A - Owner
  const ownerAHash = await bcrypt.hash('owner@alpha123', BCRYPT_ROUNDS);
  const ownerA = await prisma.user.upsert({
    where: { email: 'owner@alpha-electronics.com' },
    update: {},
    create: {
      name: 'Ali Khan (Owner)',
      email: 'owner@alpha-electronics.com',
      passwordHash: ownerAHash,
      role: Role.owner,
      tenantId: tenantA.id,
      permissions: ALL_PERMISSIONS,
    },
  });
  console.log(`    → Owner: ${ownerA.email}`);

  // Tenant A - Cashier
  const cashierAHash = await bcrypt.hash('cashier@alpha123', BCRYPT_ROUNDS);
  const cashierA = await prisma.user.upsert({
    where: { email: 'cashier@alpha-electronics.com' },
    update: {},
    create: {
      name: 'Ahmed (Cashier)',
      email: 'cashier@alpha-electronics.com',
      passwordHash: cashierAHash,
      role: Role.cashier,
      tenantId: tenantA.id,
      permissions: CASHIER_PERMISSIONS,
    },
  });
  console.log(`    → Cashier: ${cashierA.email}`);

  // Tenant A - Inventory Manager
  const invMgrAHash = await bcrypt.hash('invmgr@alpha123', BCRYPT_ROUNDS);
  const invMgrA = await prisma.user.upsert({
    where: { email: 'inventory@alpha-electronics.com' },
    update: {},
    create: {
      name: 'Bilal (Inventory Manager)',
      email: 'inventory@alpha-electronics.com',
      passwordHash: invMgrAHash,
      role: Role.inventory_manager,
      tenantId: tenantA.id,
      permissions: INVENTORY_MANAGER_PERMISSIONS,
    },
  });
  console.log(`    → Inventory Mgr: ${invMgrA.email}`);

  // Tenant A - Default Shop Settings
  const existingSettingsA = await prisma.shopSettings.findFirst({
    where: { tenantId: tenantA.id },
  });
  if (!existingSettingsA) {
    await prisma.shopSettings.create({
      data: {
        tenantId: tenantA.id,
        shopName: 'Alpha Electronics',
        lowStockThreshold: 3,
        deadStockDays: 60,
        maxDiscountWithoutOtp: 500,
        returnFraudWindowDays: 30,
        returnFraudCountThreshold: 2,
      },
    });
    console.log(`    → Shop Settings seeded`);
  }

  // ─── Tenant B: Beta Mobile ──────────────────────────────────────────────

  const tenantB = await prisma.tenant.upsert({
    where: { slug: 'beta-mobile' },
    update: {},
    create: {
      name: 'Beta Mobile Shop',
      slug: 'beta-mobile',
      status: 'active',
      plan: 'trial',
      maxUsers: 5,
    },
  });
  console.log(`  ✅ Tenant B: ${tenantB.name} (${tenantB.slug})`);

  // Tenant B - Owner
  const ownerBHash = await bcrypt.hash('owner@beta123', BCRYPT_ROUNDS);
  const ownerB = await prisma.user.upsert({
    where: { email: 'owner@beta-mobile.com' },
    update: {},
    create: {
      name: 'Sara Malik (Owner)',
      email: 'owner@beta-mobile.com',
      passwordHash: ownerBHash,
      role: Role.owner,
      tenantId: tenantB.id,
      permissions: ALL_PERMISSIONS,
    },
  });
  console.log(`    → Owner: ${ownerB.email}`);

  // Tenant B - Cashier
  const cashierBHash = await bcrypt.hash('cashier@beta123', BCRYPT_ROUNDS);
  const cashierB = await prisma.user.upsert({
    where: { email: 'cashier@beta-mobile.com' },
    update: {},
    create: {
      name: 'Zain (Cashier)',
      email: 'cashier@beta-mobile.com',
      passwordHash: cashierBHash,
      role: Role.cashier,
      tenantId: tenantB.id,
      permissions: CASHIER_PERMISSIONS,
    },
  });
  console.log(`    → Cashier: ${cashierB.email}`);

  // Tenant B - Technician
  const techBHash = await bcrypt.hash('tech@beta123', BCRYPT_ROUNDS);
  const techB = await prisma.user.upsert({
    where: { email: 'tech@beta-mobile.com' },
    update: {},
    create: {
      name: 'Usman (Technician)',
      email: 'tech@beta-mobile.com',
      passwordHash: techBHash,
      role: Role.technician,
      tenantId: tenantB.id,
      permissions: TECHNICIAN_PERMISSIONS,
    },
  });
  console.log(`    → Technician: ${techB.email}`);

  // Tenant B - Default Shop Settings
  const existingSettingsB = await prisma.shopSettings.findFirst({
    where: { tenantId: tenantB.id },
  });
  if (!existingSettingsB) {
    await prisma.shopSettings.create({
      data: {
        tenantId: tenantB.id,
        shopName: 'Beta Mobile Shop',
        lowStockThreshold: 2,
        deadStockDays: 45,
        maxDiscountWithoutOtp: 300,
        returnFraudWindowDays: 14,
        returnFraudCountThreshold: 3,
      },
    });
    console.log(`    → Shop Settings seeded`);
  }

  console.log('\n🎉 Seeding complete!');
  console.log('\n📋 Login credentials:');
  console.log('  Platform Admin:  admin@electrotrack.io / platform@123');
  console.log('  Alpha Owner:     owner@alpha-electronics.com / owner@alpha123');
  console.log('  Alpha Cashier:   cashier@alpha-electronics.com / cashier@alpha123');
  console.log('  Alpha Inv Mgr:   inventory@alpha-electronics.com / invmgr@alpha123');
  console.log('  Beta Owner:      owner@beta-mobile.com / owner@beta123');
  console.log('  Beta Cashier:    cashier@beta-mobile.com / cashier@beta123');
  console.log('  Beta Technician: tech@beta-mobile.com / tech@beta123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
