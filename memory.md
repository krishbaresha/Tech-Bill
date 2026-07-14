# TechBill POS System - Project Memory

## Architecture Overview
- **Backend (`techbill-api`)**: NestJS, Prisma ORM, PostgreSQL (via Supabase). Hosted on an Azure VM.
- **Frontend (`techbill-pos`)**: React, Vite, Zustand, TailwindCSS, React Router. Hosted on Vercel with auto-deployment on push to the `master` branch.
- **Database**: PostgreSQL on Supabase (Pooler connection string required for Prisma, which is sensitive to execution environment).

## Key Workflows & Scripts

### Remote VM Deployment
The backend VM is managed via a custom Node.js script located at `scratch/vm_run.js`.
To pull the latest changes, build, and restart PM2 on the production VM, use:
```javascript
node scratch/vm_run.js
```
*Note: Any schema changes require `npx prisma db push --accept-data-loss` (or `npx prisma migrate deploy`) to be run on the VM environment.*

### WebSocket Events
Real-time updates are handled via `EventsGateway`. 
- `sale.created` event is emitted when a sale succeeds.
- Frontend components (like `SalesFeed.tsx` and `OwnerDashboard.tsx`) subscribe to this via `socket.on('sale.created')` to update live metrics and feeds.

## Important Fixes & Recent Work

### 1. Concurrency & Race Conditions
- Refactored `sales.service.ts` to implement strict atomic `updateMany` locking for generic products when pulling stock for a sale.
- Ensured idempotency by checking `idempotencyKey` via `@unique` constraints in the database, avoiding double-charges for duplicate API requests.

### 2. POS Offline / Session Issues
- Fixed `CashDrawerSession` bug where an active sessionId was incorrectly strictly required in some environments. The POS backend now auto-assigns an open drawer session to a user if one is not explicitly provided in the payload.

### 3. Dashboard Visibility Bug
- The "Starter" subscription feature gate was incorrectly wrapping the *entire* `OwnerDashboard` container (`inset-0 absolute z-30`), thus obscuring basic business metrics like "Total Sales", "Items Sold", and "Discounts Given".
- Moved the feature gate paywall down to explicitly lock *only* the advanced analytics (`SalesChart`, `StockAlerts`, `SalesFeed`, and `AiInsights`), leaving the basic summary visible to all users.
- Connected the Dashboard Summary to the WebSocket `sale.created` payload so that POS sales immediately update the main dashboard stats in real-time.


### 4. Mistaken Action Deletions & IP Logging
- Added `trust proxy` in NestJS to properly retrieve and record actual IP addresses (e.g. `req.ip` via Nginx) rather than local proxy loops like `::ffff:127.0.0.1` in Audit Logs.
- Implemented a 24-hour hard-delete window for the Owner role to permanently delete mistakenly created Sales, Returns, and Online Orders.
- Deleting an invoice or return gracefully restores the associated inventory items (from `sold` back to `in_stock`, and vice versa) and recursively recalculates parent sale statuses (e.g. reverting a Sale to `completed` if its last return is deleted).

### 5. Purchase Orders & Inventory Enhancements
- Removed the redundant GRN (Good Receipt Note) flow.
- Purchase Orders now auto-create suppliers if they don't exist and integrate directly into the gross profit deduction.
- Inventory restocking now happens automatically upon receiving a Purchase Order, including manual and auto serial number generation support.

### 6. Expenses & Net Profit Reporting
- Standard daily expenses (e.g. lunch, supplies) are now separated from Purchase Order costs in `reports.service.ts`.
- Implemented a true `Net Profit` calculation (`Gross Profit - Expenses`) which surfaces directly on the `OwnerDashboard` and `ReportsPage`.
- Added dynamic real-time summation of expenses on the `ExpensesPage` header for quick visibility.
- Added **"Personal Expenses"** as a selectable category in the Expense form (between Maintenance and Adjustment / Shortage).

### 7. Dashboard Expense Timezone Bug (Critical Fix)
- **Root Cause**: The `Expense` model uses a PostgreSQL `@db.Date` column (date-only, no time). The `buildSummary` method was passing full timestamp ranges (e.g. `2026-07-13T19:00:00Z` to `2026-07-14T18:59:59Z`) to filter expenses. PostgreSQL strips the time portion when comparing against a `DATE` column, causing it to match `>= 2026-07-13` — bleeding previous day's expenses into today's dashboard.
- **Fix**: Separated the date window for expense/reconciliation queries from the timestamp range used for sales. Expenses are now queried using exact UTC midnight boundaries (e.g. `date = 2026-07-14T00:00:00Z`), strictly isolating them to the correct calendar day.
- **Files Changed**: `techbill-api/src/modules/reports/reports.service.ts` — `buildSummary()`, `getTodayReconciliationState()`, `submitReconciliation()`.

## Known Gotchas
1. **Prisma Supabase Pooler**: Trying to connect to the Supabase connection pool directly from the IDE VM via ad-hoc scripts often fails due to network routing. Workarounds involve executing Prisma scripts directly on the production VM using SSH/`vm_run.js`.
2. **Timezones**: The `createdAt` timestamps in Prisma rely on UTC. The Node API correctly translates local date requests (e.g. `start = new Date('2026-07-11T00:00:00+05:00')`) into UTC for database querying. Do not manually subtract timezone hours unless absolutely necessary, as `Date` handles it internally.
3. **PM2 Restarts**: Always remember to run `pm2 restart electrotrack-backend` after updating code on the VM or pushing Prisma client updates.
4. **`@db.Date` vs Timestamp Filtering**: When querying models with `@db.Date` fields (e.g. `Expense`, `CashReconciliation`), do NOT use timezone-offset timestamps as range filters. PostgreSQL will ignore the time part and bleed into adjacent days. Always use exact UTC midnight dates (e.g. `new Date('2026-07-14T00:00:00Z')`) as both `gte` and `lte` to match a single day.
5. **`DIRECT_URL` on VM**: The VM `.env` requires both `DATABASE_URL` and `DIRECT_URL` to be set for Prisma to work. If only `DATABASE_URL` is set, `npx prisma db push` will fail with `P1012`. Use `scratch/fix_env.js` to auto-append `DIRECT_URL` if missing.

*Last Updated: July 14, 2026*
