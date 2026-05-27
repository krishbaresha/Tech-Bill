# ElectroTrack SaaS Execution Order

## Purpose

Ye master index batata hai ke kaunsi markdown file kab use karni hai. Is process ka goal old single-shop POS ko SaaS product mein convert karna hai jahan har tenant/shop ka data isolated ho, Google auth removed ho, admin workers ko control kare, aur baad mein Stitch UI safely sync ho.

## Preconditions

1. Work from repo root: `C:\Users\krish\Downloads\md`.
2. Do not execute `PLAN.md`; it is legacy single-tenant reference only.
3. Do not execute `ELECTROTRACK_CLAUDE_CODE_MASTER.md` directly; it is Phase 3 source material only.
4. Keep `electrotrack-api` and `electrotrack-pos` builds as mandatory checkpoints.

## Execution Order

1. Read this file fully.
2. Execute `01_PHASE_0_PREFLIGHT_FIXES.md`.
3. Stop and verify:
   - `cd electrotrack-api && npm run build`
   - `cd electrotrack-pos && npm run build`
4. Execute `02_PHASE_1_SAAS_AUTH_FOUNDATION.md`.
5. Stop and verify Google auth removal, tenant login, and tenant data isolation.
6. Execute `03_PHASE_2_PERMISSIONS_FRONTEND_ACCESS.md`.
7. Stop and verify admin-controlled worker permissions and passwords.
8. Execute `04_PHASE_3_STITCH_UI_SYNC.md`.
9. Stop and verify Stitch UI still respects tenant scope and permissions.
10. Execute `05_PHASE_4_FINAL_QA_RELEASE.md`.
11. Use these support docs during all phases:
    - `PERMISSION_MATRIX.md`
    - `API_CONTRACT_CHANGES.md`
    - `DB_MIGRATION_PLAN.md`
    - `AGENT_PROMPTS.md`

## Command Checklist

1. Backend build:
   - `cd C:\Users\krish\Downloads\md\electrotrack-api`
   - `npm run build`
2. Frontend build:
   - `cd C:\Users\krish\Downloads\md\electrotrack-pos`
   - `npm run build`
3. Search for Google auth leftovers:
   - `rg -n "google|Google|GOOGLE|oauth|OAuth" .`
4. Search for tenant leaks after Phase 1:
   - `rg -n "findMany|findFirst|findUnique|update|delete|create" electrotrack-api\src\modules`
   - Manually confirm tenant-owned services use `tenantId`.
5. Search for route mismatch:
   - `rg -n "/audit|audit-logs" electrotrack-api\src electrotrack-pos\src`

## Do Not Continue Until

1. Each phase acceptance checklist is complete.
2. Backend and frontend builds pass at the phase checkpoint.
3. Tenant isolation tests are passing after Phase 1.
4. Permission tests are passing after Phase 2.

## Rollback Notes

1. If Phase 0 fails, revert only compile-fix changes.
2. If Phase 1 fails, revert migration and auth/tenant changes together.
3. If Phase 2 fails, revert frontend permission gating and permission guard changes together.
4. If Phase 3 fails, revert UI files only; do not revert SaaS/auth foundation.
