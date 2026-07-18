-- Per-shop licensing (2026-07-17): a License belongs to a Tenant, not a
-- single User, so any staff member at that shop may activate/use it.
-- `user_id`/`issued_by` are unchanged and remain the audit trail of who a
-- license was issued for/by; `tenant_id` is what activation and checkin
-- authorize against going forward.
--
-- Verified immediately before writing this migration: the `licenses` table
-- has 0 rows in production (see scratch/backups/ for a full pre-migration
-- backup taken the same session), so this is a pure schema addition with no
-- backfill required and no risk of a NOT NULL violation on existing rows.

-- AddColumn
ALTER TABLE "licenses" ADD COLUMN "tenant_id" UUID NOT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "licenses_tenant_id_idx" ON "licenses"("tenant_id");

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
