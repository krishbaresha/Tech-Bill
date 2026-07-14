import { PrismaClient, Role, TenantStatus, FeatureStatus, BillingCycle, FeatureAccess } from '@prisma/client';
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
  console.log('🌱 Seeding TechBill Platform Control Center...');

  // ─── 1. Seed Feature Categories ───────────────────────────────────────────
  const categoriesData = [
    { key: 'sales', name: 'Sales' },
    { key: 'inventory', name: 'Inventory' },
    { key: 'crm', name: 'CRM' },
    { key: 'finance', name: 'Finance' },
    { key: 'reports', name: 'Reports' },
    { key: 'analytics', name: 'Analytics' },
    { key: 'administration', name: 'Administration' },
    { key: 'ai', name: 'AI' },
    { key: 'integrations', name: 'Integrations' },
    { key: 'settings', name: 'Settings' }
  ];
  
  const categories: Record<string, any> = {};
  for (const cat of categoriesData) {
    categories[cat.key] = await prisma.featureCategory.upsert({
      where: { key: cat.key },
      update: { name: cat.name },
      create: { key: cat.key, name: cat.name }
    });
  }
  console.log('  ✅ Feature Categories initialized');

  // ─── 2. Seed Features ─────────────────────────────────────────────────────
  const featuresData = [
    // Sales
    { key: 'pos', name: 'POS', route: '/pos', icon: 'ShoppingCart', menuOrder: 1, categoryKey: 'sales' },
    { key: 'invoices', name: 'Invoices', route: '/invoices', icon: 'FileText', menuOrder: 2, categoryKey: 'sales' },
    { key: 'returns', name: 'Returns', route: '/returns', icon: 'RotateCcw', menuOrder: 3, categoryKey: 'sales' },
    
    // Inventory
    { key: 'inventory', name: 'Inventory', route: '/inventory', icon: 'Package', menuOrder: 1, categoryKey: 'inventory' },
    { key: 'purchase_orders', name: 'Purchase Orders', route: '/purchase-orders', icon: 'ShoppingBag', menuOrder: 2, categoryKey: 'inventory' },
    { key: 'suppliers', name: 'Suppliers', route: '/suppliers', icon: 'Building2', menuOrder: 3, categoryKey: 'inventory' },
    { key: 'warranty', name: 'Warranty', route: '/warranty', icon: 'ShieldCheck', menuOrder: 4, categoryKey: 'inventory' },
    
    // CRM
    { key: 'customers', name: 'Customers', route: '/customers', icon: 'UserCircle', menuOrder: 1, categoryKey: 'crm' },
    { key: 'loyalty_rewards', name: 'Loyalty Rewards', route: '/loyalty', icon: 'Star', menuOrder: 2, categoryKey: 'crm' },
    
    // Finance
    { key: 'expenses', name: 'Expenses', route: '/expenses', icon: 'Wallet', menuOrder: 1, categoryKey: 'finance' },
    { key: 'credit', name: 'Credit (Khata)', route: '/credit', icon: 'CreditCard', menuOrder: 2, categoryKey: 'finance' },
    { key: 'cash_reconciliation', name: 'Cash Reconciliation', route: '/cash-reconciliation', icon: 'Banknote', menuOrder: 3, categoryKey: 'finance' },
    
    // Reports
    { key: 'reports', name: 'Reports', route: '/reports', icon: 'FileText', menuOrder: 1, categoryKey: 'reports' },
    
    // Analytics
    { key: 'dashboard', name: 'Dashboard', route: '/dashboard', icon: 'BarChart3', menuOrder: 1, categoryKey: 'analytics' },
    { key: 'return_analytics', name: 'Return Analytics', route: '/return-analytics', icon: 'TrendingDown', menuOrder: 2, categoryKey: 'analytics' },
    
    // Administration
    { key: 'users_staff', name: 'Users & Staff', route: '/users', icon: 'Users', menuOrder: 1, categoryKey: 'administration' },
    { key: 'audit_logs', name: 'Audit Logs', route: '/audit', icon: 'ClipboardList', menuOrder: 2, categoryKey: 'administration' },
    
    // Settings
    { key: 'shop_settings', name: 'Shop Settings', route: '/settings', icon: 'Settings', menuOrder: 1, categoryKey: 'settings' }
  ];

  const features: Record<string, any> = {};
  for (const feat of featuresData) {
    features[feat.key] = await prisma.feature.upsert({
      where: { key: feat.key },
      update: {
        name: feat.name,
        route: feat.route,
        icon: feat.icon,
        menuOrder: feat.menuOrder,
        categoryId: categories[feat.categoryKey].id,
      },
      create: {
        key: feat.key,
        name: feat.name,
        route: feat.route,
        icon: feat.icon,
        menuOrder: feat.menuOrder,
        categoryId: categories[feat.categoryKey].id,
        isSystemFeature: true,
        status: FeatureStatus.STABLE
      }
    });
  }
  console.log('  ✅ Feature Toggles initialized');

  // ─── 3. Seed Subscription Plans ───────────────────────────────────────────
  const plansData = [
    {
      name: 'Starter',
      price: 19.99,
      billingCycle: BillingCycle.MONTHLY,
      featureKeys: ['pos', 'inventory', 'customers', 'dashboard', 'shop_settings']
    },
    {
      name: 'Professional',
      price: 49.99,
      billingCycle: BillingCycle.MONTHLY,
      featureKeys: [
        'pos', 'invoices', 'returns', 'inventory', 'suppliers',
        'customers', 'expenses', 'credit', 'reports', 'dashboard',
        'shop_settings', 'users_staff'
      ]
    },
    {
      name: 'Business',
      price: 99.99,
      billingCycle: BillingCycle.MONTHLY,
      featureKeys: [
        'pos', 'invoices', 'returns', 'inventory', 'purchase_orders', 'suppliers',
        'warranty', 'customers', 'loyalty_rewards', 'expenses', 'credit',
        'cash_reconciliation', 'reports', 'dashboard', 'return_analytics',
        'users_staff', 'audit_logs', 'shop_settings'
      ]
    },
    {
      name: 'Enterprise',
      price: 199.99,
      billingCycle: BillingCycle.MONTHLY,
      featureKeys: [
        'pos', 'invoices', 'returns', 'inventory', 'purchase_orders', 'suppliers',
        'warranty', 'customers', 'loyalty_rewards', 'expenses', 'credit',
        'cash_reconciliation', 'reports', 'dashboard', 'return_analytics',
        'users_staff', 'audit_logs', 'shop_settings'
      ]
    },
    {
      name: 'Unlimited',
      price: 499.99,
      billingCycle: BillingCycle.LIFETIME,
      featureKeys: [
        'pos', 'invoices', 'returns', 'inventory', 'purchase_orders', 'suppliers',
        'warranty', 'customers', 'loyalty_rewards', 'expenses', 'credit',
        'cash_reconciliation', 'reports', 'dashboard', 'return_analytics',
        'users_staff', 'audit_logs', 'shop_settings'
      ]
    }
  ];

  const plans: Record<string, any> = {};
  for (const plan of plansData) {
    plans[plan.name] = await prisma.subscriptionPlan.upsert({
      where: { name: plan.name },
      update: {
        price: plan.price,
        billingCycle: plan.billingCycle,
        isActive: true
      },
      create: {
        name: plan.name,
        price: plan.price,
        billingCycle: plan.billingCycle,
        isActive: true
      }
    });

    // Delete existing features for plan mapping to reseed
    await prisma.subscriptionPlanFeature.deleteMany({
      where: { planId: plans[plan.name].id }
    });

    // Link features
    for (const fKey of plan.featureKeys) {
      if (features[fKey]) {
        await prisma.subscriptionPlanFeature.create({
          data: {
            planId: plans[plan.name].id,
            featureId: features[fKey].id,
            access: FeatureAccess.FULL
          }
        });
      }
    }
  }
  console.log('  ✅ Subscription Plans & Default Features initialized');

  // ─── 4. Seed Platform Admin ────────────────────────────────────────────────
  const platformAdminHash = await bcrypt.hash('platform@123', BCRYPT_ROUNDS);
  const platformAdmin = await prisma.user.upsert({
    where: { email: 'admin@techbill.app' },
    update: {},
    create: {
      name: 'Platform Admin',
      email: 'admin@techbill.app',
      passwordHash: platformAdminHash,
      role: Role.platform_admin,
      tenantId: null,
      permissions: [],
    },
  });
  console.log(`  ✅ Platform Admin: ${platformAdmin.email}`);

  // ─── 5. Tenant A: Alpha Electronics ────────────────────────────────────────
  const tenantA = await prisma.tenant.upsert({
    where: { slug: 'alpha-electronics' },
    update: {
      status: TenantStatus.ACTIVE,
      subscriptionPlanId: plans['Professional'].id
    },
    create: {
      name: 'Alpha Electronics',
      slug: 'alpha-electronics',
      status: TenantStatus.ACTIVE,
      plan: 'standard',
      maxUsers: 10,
      subscriptionPlanId: plans['Professional'].id,
      subscriptionStartAt: new Date(),
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
  });
  console.log(`  ✅ Tenant A: ${tenantA.name} (${tenantA.slug}) connected to Professional Plan`);

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
  await prisma.user.upsert({
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

  // Tenant A - Inventory Manager
  const invMgrAHash = await bcrypt.hash('invmgr@alpha123', BCRYPT_ROUNDS);
  await prisma.user.upsert({
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
  }

  // ─── 6. Tenant B: Beta Mobile ──────────────────────────────────────────────
  const tenantB = await prisma.tenant.upsert({
    where: { slug: 'beta-mobile' },
    update: {
      status: TenantStatus.ACTIVE,
      subscriptionPlanId: plans['Starter'].id
    },
    create: {
      name: 'Beta Mobile Shop',
      slug: 'beta-mobile',
      status: TenantStatus.ACTIVE,
      plan: 'trial',
      maxUsers: 5,
      subscriptionPlanId: plans['Starter'].id,
      subscriptionStartAt: new Date(),
      subscriptionExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    },
  });
  console.log(`  ✅ Tenant B: ${tenantB.name} (${tenantB.slug}) connected to Starter Plan`);

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
  await prisma.user.upsert({
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

  // Tenant B - Technician
  const techBHash = await bcrypt.hash('tech@beta123', BCRYPT_ROUNDS);
  await prisma.user.upsert({
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
  }

  console.log('\n🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
