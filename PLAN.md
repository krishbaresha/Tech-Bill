# LEGACY WARNING

This file is a legacy single-tenant POS build tracker. Do not execute it for the SaaS build.

Use `docs/execution/00_README_EXECUTION_ORDER.md` as the current execution source of truth.
This file can still be used as historical context for the original NestJS/React POS scope.

---

# ElectroTrack POS — Build Plan & Progress Tracker

**Stack:** NestJS + Prisma + PostgreSQL + Redis | React + Vite + Tailwind + Zustand  
**Total Endpoints:** 45 REST + 5 WebSocket events  
**Estimated Time:** ~44 hours (AI-assisted)

---

## Build Phases

- [ ] **Phase 0** — Project Scaffolding
- [ ] **Phase 1** — Database Schema (Prisma)
- [ ] **Phase 2** — Auth Module
- [ ] **Phase 3** — Inventory Module
- [ ] **Phase 4** — Sales / POS Module (backend)
- [ ] **Phase 5** — Returns Module
- [ ] **Phase 6** — Audit Log System
- [ ] **Phase 7** — Real-Time WebSocket Gateway
- [ ] **Phase 8** — Reports Module
- [ ] **Phase 9** — Frontend: POS Screen
- [ ] **Phase 10** — Frontend: Owner Dashboard
- [ ] **Phase 11** — Offline Support (PWA + Dexie.js)

---

## Phase 0 — Project Scaffolding

- [ ] `npx @nestjs/cli new electrotrack-api` — init NestJS backend
- [ ] Install backend deps: Prisma, JWT, Passport, bcrypt, Socket.IO, class-validator
- [ ] `npm create vite@latest electrotrack-web -- --template react-ts` — init React frontend
- [ ] Install frontend deps: Tailwind, Zustand, React Hook Form, Zod, Axios, Dexie
- [ ] `npx shadcn@latest init` — setup component library
- [ ] Copy `.env.example` to `.env` and fill in values
- [ ] Setup `.gitignore` (include `.env`, `node_modules`, `dist`)

---

## Phase 1 — Database Schema (Prisma)

- [ ] Create `prisma/schema.prisma` with all 16 tables
- [ ] **Table:** `users` (id, name, email, password_hash, role enum, is_active, timestamps)
- [ ] **Table:** `products` (id, name, brand, category, cost_price, selling_price, warranty_months)
- [ ] **Table:** `inventory_units` (id, serial_number UNIQUE, product_id, status enum, condition, purchase_price, received_at)
- [ ] **Table:** `suppliers` (id, name, contact_name, phone, email, address)
- [ ] **Table:** `purchase_orders` (id, supplier_id, status enum, total_amount, notes, created_by)
- [ ] **Table:** `goods_received_notes` (id, purchase_order_id, received_by, notes, received_at)
- [ ] **Table:** `customers` (id, name, phone UNIQUE, email)
- [ ] **Table:** `sales` (id, invoice_number UNIQUE, customer_id, sold_by, payment_method enum, subtotal, discount_amount, total_amount, status enum)
- [ ] **Table:** `sale_items` (id, sale_id, inventory_unit_id, selling_price, discount)
- [ ] **Table:** `returns` (id, sale_id, inventory_unit_id, requested_by, reason, return_type enum, status enum, reviewed_by, refund_amount)
- [ ] **Table:** `cash_reconciliations` (id, date, opening_balance, expected_cash, actual_cash, variance GENERATED, submitted_by)
- [ ] **Table:** `audit_logs` (id, user_id, action, entity_type, entity_id, old_value JSONB, new_value JSONB, ip_address, device_info, created_at)
- [ ] **Table:** `notifications` (id, user_id, type, message, is_read, action_url)
- [ ] Add indexes on: `serial_number`, `phone`, `invoice_number`, `created_at`
- [ ] Add all foreign key relations with proper cascade rules
- [ ] Define all enums: `Role`, `UnitStatus`, `UnitCondition`, `SaleStatus`, `PaymentMethod`, `ReturnType`, `ReturnStatus`, `POStatus`
- [ ] Create `prisma/seed.ts` — 1 owner, 1 cashier, 5 products with serials
- [ ] Run `npx prisma migrate dev --name init` and verify clean migration
- [ ] Run `npx prisma db seed` and verify seed data

---

## Phase 2 — Auth Module

- [ ] `POST /auth/login` — bcrypt verify, return access_token + refresh_token (httpOnly cookie)
- [ ] `POST /auth/refresh` — rotate refresh token, return new access_token
- [ ] `POST /auth/logout` — invalidate refresh token
- [ ] `POST /auth/request-otp` — generate 6-digit OTP, store in Redis (5 min TTL), send email
- [ ] `POST /auth/verify-otp` — verify OTP from Redis, return short-lived otp_token (2 min)
- [ ] `JwtAuthGuard` — protect all routes
- [ ] `RolesGuard` + `@Roles()` decorator — RBAC enforcement
- [ ] `OtpGuard` — verify `otp_token` for sensitive endpoints
- [ ] Log `user.login` and `user.failed_login` to audit system
- [ ] Test: valid login returns tokens, wrong password returns 401, wrong role returns 403

---

## Phase 3 — Inventory Module

- [ ] `GET /inventory/units` — paginated, filter by status + product_id (Owner, Inventory Mgr)
- [ ] `POST /inventory/units` — add single unit; reject duplicate serial with 409
- [ ] `POST /inventory/units/bulk` — CSV upload; skip duplicates; return `{ success, skipped, errors[] }`
- [ ] `GET /inventory/units/lookup/:serial` — POS hotpath; target <50ms; return unit+product or `{ available: false, reason }`
- [ ] `PATCH /inventory/units/:id/status` — Owner only
- [ ] `GET /products` — all products with per-status stock count summary
- [ ] `POST /products` — create product (Owner only)
- [ ] `GET /products/:id` — product detail + stock summary
- [ ] `PUT /products/:id` — update product (Owner only)
- [ ] `DELETE /products/:id` — soft delete (Owner only)
- [ ] `GET /suppliers` — list suppliers
- [ ] `POST /suppliers` — create supplier (Owner only)
- [ ] `POST /purchase-orders` — create PO
- [ ] `GET /purchase-orders` — list POs
- [ ] `POST /grn` — create GRN + assign serials to units
- [ ] `GET /grn/:id` — GRN detail
- [ ] Emit `inventory.unit_added` and `inventory.status_changed` events

---

## Phase 4 — Sales / POS Module

- [ ] `POST /sales` — full Prisma transaction: verify serials in_stock, create sale, create items, flip units to `sold`
- [ ] `GET /sales` — paginated, filter by date range + staff_id
- [ ] `GET /sales/:id` — full detail with items, customer, staff
- [ ] `PATCH /sales/:id/void` — Owner + OTP; revert unit statuses to `in_stock`
- [ ] `GET /sales/:id/invoice` — generate + return PDF (PDFKit)
- [ ] `GET /customers` — list customers
- [ ] `POST /customers` — auto find-or-create by phone on first sale
- [ ] `GET /customers/search?phone=` — cashier lookup before sale
- [ ] Invoice number format: `INV-YYYYMMDD-XXXX` sequential per day
- [ ] Discount threshold: require `otp_token` if `discount_amount > MAX_DISCOUNT_WITHOUT_OTP`
- [ ] Emit `sale.created` and `sale.voided` events

---

## Phase 5 — Returns Module

- [ ] `POST /returns` — initiate return; flip unit to `return_pending` immediately; fraud check (2+ returns in 30 days sets `suspicious_flag: true`)
- [ ] `GET /returns` — Owner sees all; Cashier sees own; filter by status
- [ ] `GET /returns/:id` — full return detail
- [ ] `PATCH /returns/:id/approve` — Owner + OTP; set unit to `returned`; handle exchange if `exchange_unit_id` provided
- [ ] `PATCH /returns/:id/reject` — Owner + OTP; revert unit to `sold`; `review_notes` required
- [ ] Emit `return.requested`, `return.approved`, `return.rejected` events

---

## Phase 6 — Audit Log System

- [ ] `AuditListener` — `@OnEvent()` on all 11 business events, writes to `audit_logs`
- [ ] Logged fields: `userId`, `action`, `entityType`, `entityId`, `oldValue`, `newValue`, `ipAddress`, `deviceInfo`, `createdAt`
- [ ] `GET /audit-logs` — Owner only; paginated; filter by `from`, `to`, `user_id`, `action`, `entity_type`
- [ ] `GET /audit-logs/export` — Owner only; returns CSV download
- [ ] Service guard: throw error if UPDATE or DELETE attempted on `audit_logs`
- [ ] Events covered: `sale.created`, `sale.voided`, `inventory.unit_added`, `inventory.status_changed`, `return.requested`, `return.approved`, `return.rejected`, `user.login`, `user.failed_login`, `discount.requested`, `discount.approved`

---

## Phase 7 — Real-Time WebSocket Gateway

- [ ] Socket.IO gateway with JWT auth on handshake (reject if invalid/missing)
- [ ] Only `owner` role can join `shop_{shopId}` room
- [ ] **Server → Client:** `sale_created` — `{ invoice_number, amount, staff_name, items_count, timestamp }`
- [ ] **Server → Client:** `return_requested` — `{ return_id, product_name, serial_number, reason, requested_by, timestamp }`
- [ ] **Server → Client:** `low_stock_alert` — `{ product_name, units_remaining }` (fires when stock < `DEFAULT_LOW_STOCK_THRESHOLD`)
- [ ] **Server → Client:** `cash_submitted` — `{ date, expected, actual, variance }`
- [ ] **Client → Server:** `subscribe` — join room on connect
- [ ] **Client → Server:** `unsubscribe` — leave room on disconnect
- [ ] Wire Sales, Returns, Inventory services to emit Socket.IO events via gateway

---

## Phase 8 — Reports Module

- [ ] `GET /reports/sales-summary?from=&to=` — total sales, revenue, discount, by payment method, by day, avg transaction
- [ ] `GET /reports/staff-performance?from=&to=` — per staff: count, revenue, avg, returns processed
- [ ] `GET /reports/top-products?limit=10&from=&to=` — units sold + revenue per product
- [ ] `GET /reports/dead-stock?days=60` — units `in_stock` older than N days
- [ ] `GET /reports/return-analytics?from=&to=` — totals, most returned products, reasons, suspicious customers
- [ ] `GET /reconciliation/today` — today's expected vs actual
- [ ] `POST /reconciliation` — cashier submits actual cash
- [ ] `GET /reconciliation/history?from=&to=` — all reconciliation records
- [ ] Redis cache on report endpoints (5 min TTL)

---

## Phase 9 — Frontend: POS Screen

- [ ] Two-column layout: Left (scanner + cart) | Right (order summary + payment)
- [ ] Serial number input — autofocus, Enter to scan, calls `GET /inventory/units/lookup/:serial`
- [ ] Success scan: add to cart, show product + price
- [ ] Failed scan: red error with reason (sold / return_pending / not found)
- [ ] Cart items list with remove button (confirmation on remove)
- [ ] Customer section: name + phone; search by phone
- [ ] Discount field with OTP modal when above threshold
- [ ] Payment method selector: Cash | Easypaisa | JazzCash | Card
- [ ] `POST /sales` on complete
- [ ] Success: animation + invoice preview + Print button + New Sale button
- [ ] Zustand `cartStore` for cart state
- [ ] Online/offline status badge
- [ ] Dark POS terminal theme

---

## Phase 10 — Frontend: Owner Dashboard

- [ ] 4 stat cards (live via WebSocket): Today Revenue | Units Sold | Pending Returns | Cash Variance
- [ ] Live Sales Feed — `sale_created` events, last 20 sales, slide-in animation
- [ ] Pending Approvals panel — returns + discounts
- [ ] Approve return: OTP modal → `PATCH /returns/:id/approve`
- [ ] Reject return: reason input → `PATCH /returns/:id/reject`
- [ ] Inventory Alerts: low stock + dead stock warnings
- [ ] Staff Activity today: sales count + last action per staff
- [ ] Cash Reconciliation summary: expected vs actual, color-coded variance
- [ ] Daily revenue chart (Recharts)
- [ ] Reusable OTP Modal component
- [ ] WebSocket connect on mount; listen to all 4 server events
- [ ] Fully mobile-responsive

---

## Phase 11 — Offline Support (PWA + Dexie.js)

- [ ] `lib/offline/db.ts` — Dexie tables: `pending_sales`, `inventory_cache`, `sync_errors`
- [ ] Service Worker (Vite PWA plugin): cache app shell + static assets
- [ ] Offline detection: `navigator.onLine` + periodic ping
- [ ] "Offline Mode" badge on POS screen
- [ ] Offline sale: save to `pending_sales` IndexedDB + mark unit in `inventory_cache`
- [ ] `lib/offline/syncQueue.ts` — runs on window focus + `online` event
- [ ] Sync: POST each pending sale; on conflict add to `sync_errors`
- [ ] Sync status indicator: "All synced" (green) | "X pending" (amber) | "Errors" (red)
- [ ] Inventory cache: load all `in_stock` units on app start; refresh every 30 min

---

## API Endpoint Checklist (45 REST)

### Auth (5)
- [ ] `POST /auth/login`
- [ ] `POST /auth/refresh`
- [ ] `POST /auth/logout`
- [ ] `POST /auth/request-otp`
- [ ] `POST /auth/verify-otp`

### Users / Staff (5)
- [ ] `GET /users`
- [ ] `POST /users`
- [ ] `PATCH /users/:id`
- [ ] `DELETE /users/:id`
- [ ] `GET /users/:id/activity`

### Products (5)
- [ ] `GET /products`
- [ ] `POST /products`
- [ ] `GET /products/:id`
- [ ] `PUT /products/:id`
- [ ] `DELETE /products/:id`

### Inventory / Serials (11)
- [ ] `GET /inventory/units`
- [ ] `POST /inventory/units`
- [ ] `POST /inventory/units/bulk`
- [ ] `GET /inventory/units/lookup/:serial`
- [ ] `PATCH /inventory/units/:id/status`
- [ ] `GET /suppliers`
- [ ] `POST /suppliers`
- [ ] `POST /purchase-orders`
- [ ] `GET /purchase-orders`
- [ ] `POST /grn`
- [ ] `GET /grn/:id`

### Sales / POS (8)
- [ ] `POST /sales`
- [ ] `GET /sales`
- [ ] `GET /sales/:id`
- [ ] `PATCH /sales/:id/void`
- [ ] `GET /sales/:id/invoice`
- [ ] `GET /customers`
- [ ] `POST /customers`
- [ ] `GET /customers/search?phone=`

### Returns (5)
- [ ] `POST /returns`
- [ ] `GET /returns`
- [ ] `GET /returns/:id`
- [ ] `PATCH /returns/:id/approve`
- [ ] `PATCH /returns/:id/reject`

### Cash Reconciliation (3)
- [ ] `GET /reconciliation/today`
- [ ] `POST /reconciliation`
- [ ] `GET /reconciliation/history`

### Reports (5)
- [ ] `GET /reports/sales-summary`
- [ ] `GET /reports/staff-performance`
- [ ] `GET /reports/top-products`
- [ ] `GET /reports/dead-stock`
- [ ] `GET /reports/return-analytics`

### Audit Logs (2)
- [ ] `GET /audit-logs`
- [ ] `GET /audit-logs/export`

### Notifications (3)
- [ ] `GET /notifications`
- [ ] `PATCH /notifications/:id/read`
- [ ] `PATCH /notifications/read-all`

---

## WebSocket Events (5)

### Server → Client
- [ ] `sale_created`
- [ ] `return_requested`
- [ ] `low_stock_alert`
- [ ] `cash_submitted`

### Client → Server
- [ ] `subscribe`

---

## Quick Test Checklist

- [ ] Duplicate serial → 409 Conflict
- [ ] Sell already-sold serial → blocked with reason
- [ ] Return request → unit flips to `return_pending` immediately
- [ ] Return pending unit → cannot be sold
- [ ] Owner approves return → unit flips to `returned`
- [ ] Owner rejects return → unit reverts to `sold`
- [ ] Sale with discount above threshold → OTP required
- [ ] Void sale → all units revert to `in_stock`
- [ ] Audit log → no UPDATE/DELETE operations allowed
- [ ] WebSocket → sale in cashier tab appears live in owner dashboard tab
- [ ] Offline → sale saved locally; syncs when back online
- [ ] Cash reconciliation variance → auto-calculated correctly
