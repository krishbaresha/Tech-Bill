# Database Migration Plan

## Purpose

Ye file single-tenant database ko shared-DB SaaS model mein migrate karne ka safe path define karti hai. Har tenant-owned record ko `tenantId` milega so data conflict na kare.

## Prisma Source Of Truth

Use `electrotrack-api/prisma/schema.prisma` as source of truth for API work.

Root `prisma/schema.prisma` is legacy until intentionally merged or removed in a separate cleanup phase.

## New Models

1. `Tenant`
   - `id`
   - `name`
   - `slug`
   - `status`
   - `plan`
   - `trialEndsAt`
   - `currentPeriodEnd`
   - `maxUsers`
   - `createdAt`
   - `updatedAt`
2. Optional `UserPermission`
   - `id`
   - `userId`
   - `permission`
3. Optional `PasswordResetOtp`
   - `id`
   - `userId`
   - `codeHash`
   - `expiresAt`
   - `usedAt`
   - `createdAt`

## Tenant Fields To Add

Add `tenantId` to:

1. `User`
2. `ShopSettings`
3. `Product`
4. `Supplier`
5. `PurchaseOrder`
6. `GoodsReceivedNote`
7. `InventoryUnit`
8. `Customer`
9. `Sale`
10. `Return`
11. `CashReconciliation`
12. `AuditLog`
13. `Notification`
14. Any future loyalty/warranty tables.

Add optional direct `tenantId` to `SaleItem` and `PurchaseOrderItem` only if query performance or guard simplicity needs it. Otherwise scope through parent relations.

## Backfill Strategy

1. Create one default tenant for current data:
   - Name: `Default Shop`
   - Slug: `default-shop`
   - Status: `active`
2. Assign every existing tenant-owned record to default tenant.
3. Assign existing owner/cashier/inventory/accountant/technician users to default tenant.
4. Create one platform admin with `tenantId = null`.
5. Make `tenantId` required after backfill is complete.
6. Add indexes:
   - `@@index([tenantId])`
   - compound indexes for common filters, e.g. `[tenantId, createdAt]`, `[tenantId, status]`, `[tenantId, serialNumber]`.

## Migration Steps

1. Backup database.
2. Add `Tenant` and nullable `tenantId` fields.
3. Run migration.
4. Run backfill script.
5. Verify counts by tenant.
6. Alter tenant-owned `tenantId` fields to required.
7. Add indexes and uniqueness updates.
8. Regenerate Prisma client.
9. Run backend build.

## Unique Constraint Updates

1. User email remains globally unique for v1.
2. Product names do not need global uniqueness.
3. Customer phone should become unique per tenant:
   - Replace `phone @unique` with `@@unique([tenantId, phone])`.
4. Inventory serial number should become unique per tenant:
   - Recommended v1: `@@unique([tenantId, serialNumber])`.
5. Invoice number should become unique per tenant:
   - `@@unique([tenantId, invoiceNumber])`.

## Verification Checklist

1. Every tenant-owned table has tenant records populated.
2. No tenant-owned row has null tenant after final migration.
3. Tenant A and Tenant B can use same customer phone if compound unique is implemented.
4. Tenant A and Tenant B can use same invoice sequence if compound unique is implemented.
5. Backend build passes.
6. Seed creates platform admin and sample tenant.

## Do Not Continue Until

Backfill verification proves every business row belongs to exactly one tenant.
