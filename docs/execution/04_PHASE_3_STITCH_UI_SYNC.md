# Phase 3: Stitch UI Sync

## Purpose

Is phase mein Stitch dark/glass UI ko React app mein migrate karna hai without breaking SaaS tenant isolation, permissions, or real API data. `ELECTROTRACK_CLAUDE_CODE_MASTER.md` source material hai, direct execution plan nahi.

## Preconditions

1. Phase 0, Phase 1, and Phase 2 complete.
2. Backend and frontend builds pass.
3. Tenant auth and permissions are stable.
4. Stitch export exists at `stitch_electrotrack_pos_system (1)\stitch_electrotrack_pos_system`.

## Files Likely Touched

Frontend:
1. Tailwind config and global CSS.
2. Layout components.
3. Pages and modals.
4. Shared UI components.

Backend:
1. Only add endpoints if a Stitch screen needs real data not currently available.

Database:
1. No schema changes unless a required screen has no model support.

## Line-Wise Tasks

1. Read `ELECTROTRACK_CLAUDE_CODE_MASTER.md`.
2. Apply these overrides before following it:
   - Do not keep auth/store/types intact if SaaS fields are needed.
   - Do not use mock-data-first production pages.
   - Every API-backed UI must preserve tenant scope.
   - Every page/action must respect permissions.
3. Add/merge design tokens:
   - Use Stitch dark `electrotrack/DESIGN.md` tokens.
   - Preserve existing working Tailwind setup.
4. Update global CSS:
   - Add glass card/header/sidebar/modal classes.
   - Add material symbols only if selected for UI.
   - Clean visible mojibake strings when editing files.
5. Rebuild AppShell:
   - Sidebar must hide items by permission.
   - Topbar must show tenant/admin context.
   - Notifications must be tenant-scoped.
6. Rebuild POS:
   - Adopt Stitch product-grid/cart layout.
   - Preserve serial number verification and inventory unit sale logic.
   - Keep `bank_transfer`.
7. Rebuild core pages:
   - Dashboard.
   - Inventory.
   - Reports.
   - Returns.
8. Rebuild management pages:
   - Customers, loyalty, suppliers, purchase orders, GRN, staff/users, audit, warranty, settings.
9. Rebuild modals:
   - Sale complete.
   - Add/edit product.
   - Barcode scanner.
   - Invoice print.
10. For every page:
   - Use real API data where backend exists.
   - Use local fallback only for display-only screens not yet backed by API.
   - Never hardcode cross-tenant sample IDs in production flows.
11. Run frontend build.
12. Run permission smoke tests.

## Acceptance Checklist

1. Stitch visual direction is applied.
2. POS still sells real serialized inventory units.
3. Worker permissions still hide and block restricted pages/actions.
4. Tenant A cannot see Tenant B data in any redesigned page.
5. Frontend build passes.
6. Backend build still passes.

## Rollback Notes

1. Revert UI files only if visual migration breaks.
2. Do not revert SaaS/auth/permission foundation while fixing UI.
3. Keep API contracts from Phase 1 and 2 unchanged unless explicitly planned.

## Do Not Continue Until

All redesigned pages pass tenant and permission smoke tests.
