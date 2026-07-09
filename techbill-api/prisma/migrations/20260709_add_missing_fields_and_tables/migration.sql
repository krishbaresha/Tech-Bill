-- ─── Safe migration: add all missing columns and tables ────────────────────────
-- All statements use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS for idempotency

-- ─── Tenants: add new columns ─────────────────────────────────────────────────
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "online_selling_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "app_access_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "is_warehouse_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "subscription_expires_at" TIMESTAMP(3);

-- ─── Expenses table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "expenses" (
    "id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL,
    "created_by_id" UUID,
    "tenant_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "expenses_date_idx" ON "expenses"("date");
CREATE INDEX IF NOT EXISTS "expenses_tenant_id_idx" ON "expenses"("tenant_id");

ALTER TABLE "expenses" DROP CONSTRAINT IF EXISTS "expenses_created_by_id_fkey";
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "expenses" DROP CONSTRAINT IF EXISTS "expenses_tenant_id_fkey";
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Courier Payouts table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "courier_payouts" (
    "id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "courier_name" VARCHAR(100),
    "date" DATE NOT NULL,
    "created_by_id" UUID,
    "tenant_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "courier_payouts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "courier_payouts_date_idx" ON "courier_payouts"("date");
CREATE INDEX IF NOT EXISTS "courier_payouts_tenant_id_idx" ON "courier_payouts"("tenant_id");

ALTER TABLE "courier_payouts" DROP CONSTRAINT IF EXISTS "courier_payouts_created_by_id_fkey";
ALTER TABLE "courier_payouts" ADD CONSTRAINT "courier_payouts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "courier_payouts" DROP CONSTRAINT IF EXISTS "courier_payouts_tenant_id_fkey";
ALTER TABLE "courier_payouts" ADD CONSTRAINT "courier_payouts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── TransactionStatus enum ───────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE "TransactionStatus" AS ENUM ('SUCCESS', 'FAILED', 'PENDING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ─── ShippingStatus enum ──────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE "ShippingStatus" AS ENUM ('pending', 'dispatched', 'delivered', 'returned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ─── Transactions table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "transactions" (
    "id" UUID NOT NULL,
    "order_id" VARCHAR(100) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "tenant_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "transactions_order_id_key" ON "transactions"("order_id");
CREATE INDEX IF NOT EXISTS "transactions_order_id_idx" ON "transactions"("order_id");
CREATE INDEX IF NOT EXISTS "transactions_tenant_id_idx" ON "transactions"("tenant_id");

ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_tenant_id_fkey";
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Sales: add shipping columns ──────────────────────────────────────────────
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "shipping_status" "ShippingStatus";
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "customer_name" VARCHAR(255);
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "customer_phone" VARCHAR(20);
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "customer_address" TEXT;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "courier_name" VARCHAR(100);
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "is_online_order" BOOLEAN NOT NULL DEFAULT false;
