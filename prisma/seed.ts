import { PrismaClient, Role, UnitStatus, UnitCondition } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Tenant IDs
const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const GULBERG_TENANT_ID = '00000000-0000-0000-0000-000000000002';
const DHA_TENANT_ID = '00000000-0000-0000-0000-000000000003';

// Fixed IDs for idempotency
const SHOP_SETTINGS_DEFAULT_ID = '00000000-0000-0000-0000-000000000001';
const SHOP_SETTINGS_GULBERG_ID = '00000000-0000-0000-0000-000000000004';
const SHOP_SETTINGS_DHA_ID = '00000000-0000-0000-0000-000000000005';

const GULBERG_PRODUCT_IDS = [
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
];

const DHA_PRODUCT_IDS = [
  '20000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002',
];

const ALL_PERMISSIONS = [
  'pos.read', 'pos.sell', 'pos.discount', 'pos.void',
  'inventory.read', 'inventory.write', 'inventory.delete',
  'suppliers.read', 'suppliers.write',
  'customers.read', 'customers.write',
  'returns.read', 'returns.create', 'returns.review',
  'reports.read', 'reports.cash_reconciliation',
  'users.read', 'users.manage', 'users.permissions',
  'settings.read', 'settings.manage',
  'audit.read',
  'notifications.read', 'notifications.manage',
  'warranty.read',
  'loyalty.read', 'loyalty.manage'
];

const CASHIER_PERMISSIONS = [
  'pos.read', 'pos.sell',
  'customers.read', 'customers.write',
  'returns.read', 'returns.create',
  'notifications.read',
  'warranty.read'
];

const TECH_PERMISSIONS = [
  'inventory.read',
  'warranty.read',
  'returns.read',
  'notifications.read'
];

async function main() {
  console.log('Seeding SaaS ElectroTrack database...\n');
  const BCRYPT_ROUNDS = 12;

  // ── 1. Create Tenants ──────────────────────────────────────────────────────
  console.log('--- Creating Tenants ---');
  await prisma.tenant.upsert({
    where: { id: DEFAULT_TENANT_ID },
    update: {},
    create: {
      id: DEFAULT_TENANT_ID,
      name: 'Default Shop',
      slug: 'default-shop',
      status: 'active',
      plan: 'trial'
    }
  });

  await prisma.tenant.upsert({
    where: { id: GULBERG_TENANT_ID },
    update: {},
    create: {
      id: GULBERG_TENANT_ID,
      name: 'ElectroTrack Gulberg',
      slug: 'electrotrack-gulberg',
      status: 'active',
      plan: 'pro'
    }
  });

  await prisma.tenant.upsert({
    where: { id: DHA_TENANT_ID },
    update: {},
    create: {
      id: DHA_TENANT_ID,
      name: 'ElectroTrack DHA',
      slug: 'electrotrack-dha',
      status: 'active',
      plan: 'basic'
    }
  });
  console.log('✓ Tenants initialized\n');

  // ── 2. Create Shop Settings ──────────────────────────────────────────────────
  console.log('--- Creating Shop Settings ---');
  await prisma.shopSettings.upsert({
    where: { id: SHOP_SETTINGS_DEFAULT_ID },
    update: {},
    create: {
      id: SHOP_SETTINGS_DEFAULT_ID,
      shopName: 'Default Shop',
      lowStockThreshold: 2,
      deadStockDays: 60,
      maxDiscountWithoutOtp: 500,
      returnFraudWindowDays: 30,
      returnFraudCountThreshold: 2,
      tenantId: DEFAULT_TENANT_ID
    }
  });

  await prisma.shopSettings.upsert({
    where: { id: SHOP_SETTINGS_GULBERG_ID },
    update: {},
    create: {
      id: SHOP_SETTINGS_GULBERG_ID,
      shopName: 'ElectroTrack Gulberg',
      lowStockThreshold: 2,
      deadStockDays: 60,
      maxDiscountWithoutOtp: 500,
      returnFraudWindowDays: 30,
      returnFraudCountThreshold: 2,
      tenantId: GULBERG_TENANT_ID
    }
  });

  await prisma.shopSettings.upsert({
    where: { id: SHOP_SETTINGS_DHA_ID },
    update: {},
    create: {
      id: SHOP_SETTINGS_DHA_ID,
      shopName: 'ElectroTrack DHA',
      lowStockThreshold: 2,
      deadStockDays: 60,
      maxDiscountWithoutOtp: 300,
      returnFraudWindowDays: 30,
      returnFraudCountThreshold: 2,
      tenantId: DHA_TENANT_ID
    }
  });
  console.log('✓ Shop settings initialized\n');

  // ── 3. Create Users ──────────────────────────────────────────────────────────
  console.log('--- Creating Users ---');

  // Platform Admin (No tenant)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@electrotrack.pk' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'superadmin@electrotrack.pk',
      passwordHash: await bcrypt.hash('SuperAdmin@123', BCRYPT_ROUNDS),
      role: Role.platform_admin,
      isActive: true,
      permissions: ALL_PERMISSIONS,
      tenantId: null
    }
  });

  // Gulberg Users
  const gulbergOwner = await prisma.user.upsert({
    where: { email: 'owner@electroshop.pk' },
    update: {},
    create: {
      name: 'Ahmed Raza (Gulberg Owner)',
      email: 'owner@electroshop.pk',
      passwordHash: await bcrypt.hash('Owner@123', BCRYPT_ROUNDS),
      role: Role.owner,
      isActive: true,
      permissions: ALL_PERMISSIONS,
      tenantId: GULBERG_TENANT_ID
    }
  });

  const gulbergCashier = await prisma.user.upsert({
    where: { email: 'cashier@electroshop.pk' },
    update: {},
    create: {
      name: 'Bilal Khan (Gulberg Cashier)',
      email: 'cashier@electroshop.pk',
      passwordHash: await bcrypt.hash('Cashier@123', BCRYPT_ROUNDS),
      role: Role.cashier,
      isActive: true,
      permissions: CASHIER_PERMISSIONS,
      tenantId: GULBERG_TENANT_ID
    }
  });

  const gulbergTech = await prisma.user.upsert({
    where: { email: 'tech@electroshop.pk' },
    update: {},
    create: {
      name: 'Hamza Khan (Gulberg Tech)',
      email: 'tech@electroshop.pk',
      passwordHash: await bcrypt.hash('Tech@123', BCRYPT_ROUNDS),
      role: Role.technician,
      isActive: true,
      permissions: TECH_PERMISSIONS,
      tenantId: GULBERG_TENANT_ID
    }
  });

  // DHA Users
  const dhaOwner = await prisma.user.upsert({
    where: { email: 'dha_owner@electroshop.pk' },
    update: {},
    create: {
      name: 'Salman Shah (DHA Owner)',
      email: 'dha_owner@electroshop.pk',
      passwordHash: await bcrypt.hash('Owner@123', BCRYPT_ROUNDS),
      role: Role.owner,
      isActive: true,
      permissions: ALL_PERMISSIONS,
      tenantId: DHA_TENANT_ID
    }
  });

  const dhaCashier = await prisma.user.upsert({
    where: { email: 'dha_cashier@electroshop.pk' },
    update: {},
    create: {
      name: 'Zainab Bibi (DHA Cashier)',
      email: 'dha_cashier@electroshop.pk',
      passwordHash: await bcrypt.hash('Cashier@123', BCRYPT_ROUNDS),
      role: Role.cashier,
      isActive: true,
      permissions: CASHIER_PERMISSIONS,
      tenantId: DHA_TENANT_ID
    }
  });

  console.log('✓ Users created');
  console.log(`  - Platform Admin: ${superAdmin.email}`);
  console.log(`  - Gulberg Tenant: ${gulbergOwner.email} (owner), ${gulbergCashier.email} (cashier)`);
  console.log(`  - DHA Tenant: ${dhaOwner.email} (owner), ${dhaCashier.email} (cashier)\n`);

  // ── 4. Create Products ───────────────────────────────────────────────────────
  console.log('--- Creating Products ---');

  // Gulberg Products
  const gulbergProductDefs = [
    {
      id: GULBERG_PRODUCT_IDS[0],
      name: 'Dell Inspiron 15 Laptop',
      brand: 'Dell',
      category: 'Laptops',
      costPrice: 85000,
      sellingPrice: 98000,
      warrantyMonths: 12,
      description: 'Gulberg Stock - Intel Core i5, 8GB RAM, 512GB SSD',
      tenantId: GULBERG_TENANT_ID,
      createdById: gulbergOwner.id
    },
    {
      id: GULBERG_PRODUCT_IDS[1],
      name: 'Apple iPhone 15',
      brand: 'Apple',
      category: 'Smartphones',
      costPrice: 175000,
      sellingPrice: 199000,
      warrantyMonths: 12,
      description: 'Gulberg Stock - A16 Bionic, 128GB',
      tenantId: GULBERG_TENANT_ID,
      createdById: gulbergOwner.id
    },
    {
      id: GULBERG_PRODUCT_IDS[2],
      name: 'Sony WH-1000XM5 Headphones',
      brand: 'Sony',
      category: 'Audio',
      costPrice: 38000,
      sellingPrice: 45000,
      warrantyMonths: 12,
      description: 'Gulberg Stock - Noise cancelling',
      tenantId: GULBERG_TENANT_ID,
      createdById: gulbergOwner.id
    }
  ];

  // DHA Products
  const dhaProductDefs = [
    {
      id: DHA_PRODUCT_IDS[0],
      name: 'Apple iPhone 15 Pro',
      brand: 'Apple',
      category: 'Smartphones',
      costPrice: 220000,
      sellingPrice: 245000,
      warrantyMonths: 12,
      description: 'DHA Stock - A17 Pro, Titanium frame',
      tenantId: DHA_TENANT_ID,
      createdById: dhaOwner.id
    },
    {
      id: DHA_PRODUCT_IDS[1],
      name: 'Canon EOS R50 Camera',
      brand: 'Canon',
      category: 'Cameras',
      costPrice: 95000,
      sellingPrice: 115000,
      warrantyMonths: 12,
      description: 'DHA Stock - 24.2MP sensor',
      tenantId: DHA_TENANT_ID,
      createdById: dhaOwner.id
    }
  ];

  await Promise.all(
    [...gulbergProductDefs, ...dhaProductDefs].map((p) =>
      prisma.product.upsert({
        where: { id: p.id },
        update: {},
        create: p
      })
    )
  );
  console.log('✓ Products initialized\n');

  // ── 5. Create Inventory Units ────────────────────────────────────────────────
  console.log('--- Creating Inventory Units ---');
  const unitDefs = [
    // Gulberg Dell Laptops
    { serialNumber: 'DELL-INS15-GUL-001', productId: GULBERG_PRODUCT_IDS[0], tenantId: GULBERG_TENANT_ID },
    { serialNumber: 'DELL-INS15-GUL-002', productId: GULBERG_PRODUCT_IDS[0], tenantId: GULBERG_TENANT_ID },
    // Gulberg iPhone 15s
    { serialNumber: 'APPL-IP15-GUL-001', productId: GULBERG_PRODUCT_IDS[1], tenantId: GULBERG_TENANT_ID },
    { serialNumber: 'APPL-IP15-GUL-002', productId: GULBERG_PRODUCT_IDS[1], tenantId: GULBERG_TENANT_ID },
    // Gulberg Sony Headphones
    { serialNumber: 'SONY-XM5-GUL-001', productId: GULBERG_PRODUCT_IDS[2], tenantId: GULBERG_TENANT_ID },

    // DHA iPhone 15 Pros
    { serialNumber: 'APPL-IP15PRO-DHA-001', productId: DHA_PRODUCT_IDS[0], tenantId: DHA_TENANT_ID },
    { serialNumber: 'APPL-IP15PRO-DHA-002', productId: DHA_PRODUCT_IDS[0], tenantId: DHA_TENANT_ID },
    // DHA Canon Cameras
    { serialNumber: 'CANN-R50-DHA-001', productId: DHA_PRODUCT_IDS[1], tenantId: DHA_TENANT_ID }
  ];

  for (const unit of unitDefs) {
    await prisma.inventoryUnit.upsert({
      where: {
        tenantId_serialNumber: {
          tenantId: unit.tenantId,
          serialNumber: unit.serialNumber
        }
      },
      update: {},
      create: {
        serialNumber: unit.serialNumber,
        productId: unit.productId,
        status: UnitStatus.in_stock,
        condition: UnitCondition.new,
        tenantId: unit.tenantId
      }
    });
  }

  console.log(`✓ Inventory units initialized (${unitDefs.length} units created)\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅  SaaS Database Seeding Complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
