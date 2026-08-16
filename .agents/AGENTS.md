# ElectroTrack POS — Project Rules

## Repository
- **Official GitHub Repo**: `https://github.com/krishbaresha/Tech-Bill`
- All `git push` must target `origin` which is set to `https://github.com/krishbaresha/Tech-Bill`
- The VM (`4.193.188.145`) git remote must also point to `https://github.com/krishbaresha/Tech-Bill`
- The old remote `https://github.com/talharana23/test-techbill` is stale/deleted — never use it

## VM / Server
- **Host**: `4.193.188.145`
- **User**: `techbill_admin`
- **Password**: `Office#1234_h`
- **API path**: `/home/techbill_admin/techbill/electrotrack-api/techbill-api`
- **Process manager**: PM2 — app name `electrotrack-backend`
- **Database**: Local PostgreSQL on `localhost:5432`, DB = `techbill_db`, user = `techbill_admin`, password = `TechBillSecurePass2026!`
- **Schema sync**: Use `npx prisma db push --accept-data-loss` (not migrate dev) since this is a local VM DB

## Deploy Workflow
1. Make changes locally
2. `git add` + `git commit` + `git push origin master`
3. SSH to VM → `git pull origin master`
4. `npx prisma db push --accept-data-loss` (if schema changed)
5. `npm run build`
6. `pm2 restart electrotrack-backend`

## Reporting & Accounting Logic
- **Income Statement (Accrual):** `Total Revenue` sums the exact `totalAmount` of all sales (both online and offline). It does NOT include Cash collections (e.g. Courier Payouts, Credit Payments).
- **Gross Profit:** Calculated precisely as `Total Revenue` minus `Cost of Goods Sold` (after adjusting for returns). Purchase Order outflows are NOT deducted from revenue, as they are asset/inventory purchases.
- **Total Outflows (Cash Basis):** Represented in the Dashboard and Reports as a single interactive card combining Daily Expenses, Supplier Khata Payments, and Purchase Orders Paid.
- **Online Orders (Cash Flow):** Courier payouts represent cash received for online orders. Advance payments for online orders are added to revenue and cash flow immediately on the date of sale.
- **COGS (Online Orders):** COGS for online orders is NOT deducted on the day the sale is created. It is deferred and deducted ONLY on the day the courier payout for that specific order is received.

## Folder Structure and Code Modification Rules
1. **Keep Folder Structure Clean**: Never create random or loose files in the root directories of `Tech-Bill` or `techbill-desktop-pro`. All documentation must go to their corresponding subfolders under `docs/` (e.g. `docs/planning`, `docs/architecture`, `docs/guides`, `docs/issues-and-decisions`). Keep folders organized and clean.
2. **No Arbitrary/Unsolicited Code Changes**: Never make changes to code or logic that the user has not explicitly requested or asked for. Keep modifications strictly scoped to the user's instructions.
