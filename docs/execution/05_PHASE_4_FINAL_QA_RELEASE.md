# Phase 4: Final QA And Release

## Purpose

Is phase ka goal final confidence banana hai before demo, deployment, or selling/renting the product. It verifies SaaS tenant isolation, auth rules, worker permissions, data flows, Stitch UI, and build health.

## Preconditions

1. Phase 0 through Phase 3 complete.
2. Backend and frontend builds passed at the end of Phase 3.
3. At least two tenants exist for isolation testing.
4. At least one admin and two worker accounts exist per test tenant.

## Files Likely Touched

Backend:
1. Test files only.
2. Small bug fixes found by QA.

Frontend:
1. Test files or small bug fixes found by QA.

Database:
1. Seed/test data only.

## Line-Wise Tasks

1. Run backend build.
2. Run frontend build.
3. Run backend tests if available.
4. Create Tenant A and Tenant B.
5. Create Tenant A admin and workers.
6. Create Tenant B admin and workers.
7. Verify login:
   - Platform admin.
   - Tenant admin.
   - Worker.
   - Suspended tenant user.
8. Verify password flows:
   - Tenant admin self-reset by OTP.
   - Worker self-reset blocked/generic.
   - Tenant admin resets worker password.
9. Verify permission matrix:
   - Cashier can sell but cannot manage users.
   - Inventory manager can manage inventory but cannot read financial reports unless granted.
   - Accountant can read reports but cannot alter inventory unless granted.
10. Verify tenant isolation:
   - Products.
   - Inventory units.
   - Customers.
   - Sales.
   - Returns.
   - Reports.
   - Audit logs.
   - Notifications.
11. Verify POS:
   - Serial lookup.
   - Product add to cart.
   - Payment methods.
   - Complete sale.
   - Invoice print.
   - Offline queue retry behavior.
12. Verify UI:
   - Login.
   - Dashboard.
   - POS.
   - Inventory.
   - Reports.
   - Returns.
   - Users and permissions.
   - Settings.
13. Search for forbidden leftovers:
   - `rg -n "google|Google|GOOGLE|oauth|OAuth" .`
   - `rg -n "TODO|FIXME|placeholder" electrotrack-api\src electrotrack-pos\src`
   - `rg -n "â|ð|Ã|�" electrotrack-api\src electrotrack-pos\src`
14. Record QA results.

## Acceptance Checklist

1. Backend build passes.
2. Frontend build passes.
3. Google auth is fully removed.
4. No tenant data leak is found.
5. Worker permissions pass matrix tests.
6. Admin/worker password rules pass.
7. Suspended tenant login is blocked.
8. Critical POS flow works.
9. Stitch UI pages render without access regressions.

## Rollback Notes

1. If QA finds data leak, block release and fix tenant guard/service scoping first.
2. If auth reset has a bug, disable reset endpoints until fixed.
3. If Stitch UI has a visual bug only, ship is blocked only if it breaks core workflow.

## Do Not Continue Until

All acceptance items are checked and release notes mention remaining known limitations, if any.
