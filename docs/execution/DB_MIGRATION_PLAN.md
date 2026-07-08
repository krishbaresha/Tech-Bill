# TechBill Database Migration & Backfill Plan

## Purpose

This document outlines the systematic procedure to migrate the single-tenant relational database structure into a shared-schema multi-tenant SaaS model. The migration ensures logical data separation using the `tenantId` field and handles existing records through an automated backfill script.

---

## Prisma Schema Source of Truth

*   **Active Schema**: `electrotrack-api/prisma/schema.prisma` is the singular active schema source.
*   **Legacy Schema**: The root `prisma/schema.prisma` is archived.

---

## Entity Adjustments

### 1. New Core Models
*   **`Tenant`**: Stores subscriber metadata (name, slug, billing plans, subscription status limits).
*   **`RefreshToken`**: Session credentials associated with specific users.
*   **`ShopSettings`**: Tenant configuration parameters (low-stock alarms, discount validation thresholds, return fraud windows).

### 2. Tenant Scoping Fields
Introduce `tenantId: String @db.Uuid` columns to all tenant-specific entities:
1.  `User`
2.  `ShopSettings`
3.  `Product`
4.  `Supplier`
5.  `PurchaseOrder`
6.  `GoodsReceivedNote`
7.  `InventoryUnit`
8.  `Customer`
9.  `Sale`
10. `Return`
11. `CashReconciliation`
12. `AuditLog`
13. `Notification`

---

## Database Constraints & Indexing Strategy

To prevent collisions between different shops using identical sequential identifiers or local customer phone numbers, single-column constraints are refactored into compound constraints:

### Compound Constraints Updates
*   **Customer Directory uniqueness**: Replace global uniqueness on phone number with:
    ```prisma
    @@unique([tenantId, phone])
    ```
*   **Inventory Serial tracking**: Define serial number uniqueness within the tenant scope:
    ```prisma
    @@unique([tenantId, serialNumber])
    ```
*   **Sales Invoice identifiers**: Replace global uniqueness on invoice numbers with:
    ```prisma
    @@unique([tenantId, invoiceNumber])
    ```

### Recommended Indexing Mappings
Ensure query speeds are maintained by introducing composite indexes:
*   `@@index([tenantId])` on all tenant-owned models.
*   `@@index([tenantId, createdAt])` for sales dashboards and financial histories.
*   `@@index([tenantId, status])` for returns and inventory audits.

---

## Backfill Strategy for Production Data

1.  **Initialize Default Tenant**: Create a default tenant row representing existing single-tenant stores:
    *   `name`: "Default Shop"
    *   `slug`: "default-shop"
    *   `status`: "active"
    *   `plan`: "trial"
2.  **Backfill Records**: Run a migration script updating all database rows to set `tenantId = [default-tenant-uuid]`.
3.  **Setup Platform Admins**: Provision super-admin users with `tenantId = null` to oversee the SaaS operations.
4.  **Set Required Fields**: Alter the schema definition to change `tenantId` columns from nullable to required (`NOT NULL`).
5.  **Enable Constraints**: Apply the compound constraints and indexes.
6.  **Regenerate Client**: Rebuild the Prisma client using `npx prisma generate` and verify build compiles.

---

## Verification & Rollback Checklist

*   [ ] Validate that all rows are mapped to a valid tenant.
*   [ ] Confirm compound constraints are active (e.g. Tenant A and Tenant B can register identical invoice sequences).
*   [ ] Confirm platform admin accounts can act globally without tenant context filters.
*   [ ] Verify the backend build compiles successfully.
