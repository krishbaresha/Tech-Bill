# Phase 0: Preflight Fixes

## Purpose

Is phase ka goal repo ko stable baseline banana hai before SaaS changes. Backend currently build fail kar raha hai because reports service Prisma schema se match nahi karta. Is phase mein compile blockers, route mismatch, Prisma source-of-truth, aur visible text encoding issues identify/fix honge.

## Preconditions

1. Start from repo root: `C:\Users\krish\Downloads\md`.
2. No SaaS schema migration yet.
3. No Stitch UI conversion yet.
4. Use current code exactly as baseline.

## Files Likely Touched

Backend:
1. `electrotrack-api/src/modules/reports/reports.service.ts`
2. `electrotrack-api/src/modules/audit/audit.controller.ts`
3. `electrotrack-api/src/modules/audit/audit.module.ts`

Frontend:
1. `electrotrack-pos/src/pages/audit/AuditPage.tsx`
2. Any file with visible mojibake text found by search.

Database:
1. `electrotrack-api/prisma/schema.prisma`
2. `prisma/schema.prisma`

## Line-Wise Tasks

1. Run backend build: `cd electrotrack-api && npm run build`.
2. Fix `reports.service.ts` staff performance nullability:
   - If `sale.soldById` or `sale.soldBy` is null, skip that sale.
3. Fix dead stock query:
   - Replace `createdAt` filters/select/order with `receivedAt`.
   - Keep returned field name `receivedAt` for frontend compatibility.
4. Fix return analytics query:
   - Replace `isSuspicious` with `suspiciousFlag`.
   - Ensure select includes `inventoryUnit.product` and `sale.customer`.
5. Re-run backend build.
6. Fix audit route mismatch:
   - Standard route should be `/audit-logs`.
   - Update frontend calls from `/audit` to `/audit-logs`.
   - Keep backend controller route unchanged unless a clear API versioning decision is made.
7. Decide Prisma source of truth:
   - Use `electrotrack-api/prisma/schema.prisma` as source of truth for API work.
   - Treat root `prisma/schema.prisma` as legacy until merged intentionally.
8. Compare the two Prisma schemas:
   - `Get-FileHash prisma\schema.prisma, electrotrack-api\prisma\schema.prisma`
   - Document intentional differences in `DB_MIGRATION_PLAN.md` if they affect SaaS migration.
9. Search visible mojibake:
   - `rg -n "â|ð|Ã|�" electrotrack-api\src electrotrack-pos\src *.md`
10. Replace visible UI strings only when safe.
11. Run frontend build: `cd electrotrack-pos && npm run build`.
12. Run backend build again.

## Acceptance Checklist

1. `electrotrack-api` build passes.
2. `electrotrack-pos` build passes.
3. Audit page calls `/audit-logs`.
4. Reports endpoints compile with current Prisma schema.
5. Prisma source-of-truth decision is recorded.
6. No obvious mojibake remains in newly edited visible UI strings.

## Rollback Notes

1. Revert `reports.service.ts` changes if report outputs become incorrect.
2. Revert audit route changes only as a pair: backend and frontend must match.
3. Do not delete either Prisma schema in this phase.

## Do Not Continue Until

Backend and frontend builds both pass from clean terminal commands.
