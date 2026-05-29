# ElectroTrack — SaaS POS for Electronics Retail

> A multi-tenant Point-of-Sale and inventory management platform built for electronics retailers. Premium dark UI, serial-number tracking, warranty management, AI insights, and real-time sales analytics — all in one system.

---

## Table of Contents

- [What It Is](#what-it-is)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Architecture](#architecture)
- [Pros & Cons](#pros--cons)
- [Challenges We Faced](#challenges-we-faced)
- [Who Its For](#who-its-for)
- [Roadmap](#roadmap)

---

## What It Is

ElectroTrack is a **multi-tenant SaaS POS system** designed for electronics shops. Every phone, laptop, or gadget is tracked at the individual unit level using serial numbers — so you always know exactly which device was sold to whom, when the warranty expires, and whether a return is fraudulent.

It ships as two apps:
- **`electrotrack-api`** — NestJS REST API with Prisma + PostgreSQL (Supabase)
- **`electrotrack-pos`** — React + Vite SPA (cashier / owner frontend)

---

## Tech Stack

### Backend

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Framework | NestJS 11 |
| ORM | Prisma 5 |
| Database | PostgreSQL (Supabase) |
| Auth | JWT access + refresh token rotation, bcrypt |
| OTP | `crypto.randomInt` (CSPRNG), Redis / in-memory store |
| Real-time | Socket.IO WebSockets |
| Email | Nodemailer (SMTP — Resend compatible) |
| AI | Groq SDK (llama-3.3-70b-versatile, free tier) |
| Security | Helmet, @nestjs/throttler, cookie-parser, class-validator |

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| Language | TypeScript 5 |
| Routing | React Router v6 |
| State | Zustand (persisted auth, cart) |
| Styling | Tailwind CSS v3 + custom dark design tokens |
| Animations | GSAP 3 (stagger, slide, fade) |
| Charts | Recharts |
| Icons | Lucide React |
| HTTP | Axios with JWT interceptor + silent refresh queue |
| Offline | Dexie (IndexedDB) |
| PWA | vite-plugin-pwa |

---

## Features

### Multi-Tenancy
- Platform admin manages all shop accounts
- Full data isolation per tenant — products, staff, sales, customers
- Tenant plans: trial / starter / professional
- Automatic suspension enforcement for cancelled/suspended shops

### Point of Sale
- **Universal fuzzy search** — find by product name, brand, IMEI, serial, or category with keyboard-navigable autocomplete
- **Barcode / QR scanner** via device camera
- **Serial-number-level selling** — pick the exact unit going out the door from a unit picker sheet
- **Cart** with per-item discount and 5 payment methods (Cash, Easypaisa, JazzCash, Card, Bank Transfer)
- **OTP-protected discounts** — discounts above a configurable threshold require owner OTP approval

### Inventory Dashboard
- Sectioned view: Low Stock Alerts · Recently Added · Fast Selling
- Category pill filters + status tabs (In Stock / Sold / Returned / All Items)
- 4 live stat cards: In Stock, Low Stock, Products, Total Sold
- GSAP stagger animations on load; full loading skeleton state

### Inventory Management
- Product catalogue (brand, category, cost price, selling price, warranty months)
- Unit-level tracking — every unit has serial number, condition, and one of:
  `in_stock` · `sold` · `return_pending` · `returned` · `damaged` · `repair` · `reserved`
- Bulk unit receive via Goods Receipt Notes (GRN)
- Dead stock detection with configurable day threshold

### Invoice Template System
- Luxury minimal invoice (Apple / Shopify-inspired dark aesthetic)
- Per-tenant branding: logo URL, primary color, accent color, font family
- Footer notes, watermark text, show/hide watermark toggle
- QR-style verification code on every invoice
- Color-coded payment method badge
- Print-ready (`@media print`) — no extra library needed

### Returns & Fraud Detection
- Full return workflow: create → review → approve / reject
- Suspicious flag auto-raised on repeat returns within a configurable window
- Return analytics: reason breakdown, most-returned products, high-risk customers table

### Warranty Lookup
- Search any serial number across ALL statuses (in_stock, sold, returned)
- Shows warranty expiry, customer name, and original sale invoice

### Supplier Management
- Supplier directory with contact info
- Purchase Orders with line items and status tracking
- GRN to receive physical stock and generate serial-number units

### Reports & Analytics
- Daily / date-range sales summary
- Revenue by payment method
- Top products by units sold and revenue
- Staff performance (sales count, average transaction value)
- Stock valuation (cost vs selling price)
- Cash reconciliation (opening balance, expected vs actual, variance)
- Return analytics (reasons, fraud patterns)

### Customer & Loyalty
- Customer directory with phone deduplication
- Loyalty points tracking
- Purchase history per customer

### Real-Time
- Live sales feed on owner dashboard via WebSocket
- Low-stock alerts broadcast to all connected tabs instantly

### AI Insights
- Groq-powered sales analysis (llama-3.3-70b-versatile, free tier)
- Natural language daily performance summaries

### Security
- HttpOnly cookie refresh token rotation (7-day sliding window)
- 15-minute access tokens (configurable)
- Role-based access: `platform_admin`, `owner`, `cashier`, `inventory_manager`, `accountant`, `technician`
- Granular per-user permission overrides
- OTP uses `crypto.randomInt` (CSPRNG — never `Math.random`)
- Rate limiting on all endpoints
- Helmet security headers
- Full audit log on sensitive operations

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL (or a free [Supabase](https://supabase.com) project)
- Redis (optional — OTP falls back to in-memory without it)

### 1. Clone and install

```bash
git clone https://github.com/krishbaresha/electrotrack-saas.git
cd electrotrack-saas

# Install API dependencies
cd electrotrack-api && npm install

# Install frontend dependencies
cd ../electrotrack-pos && npm install
```

### 2. Configure environment

Create `electrotrack-api/.env` from the template in [Environment Variables](#environment-variables).

For local development with demo/test accounts — add this to skip sending real emails:

```env
OTP_LOG_TO_CONSOLE=true
```

The OTP will print to your server terminal instead of being emailed.

### 3. Run the database migration

```bash
cd electrotrack-api
npx prisma migrate dev
```

### 4. Start both servers

```bash
# Terminal 1 — API (http://localhost:3000)
cd electrotrack-api && npm run start:dev

# Terminal 2 — Frontend (http://localhost:5173)
cd electrotrack-pos && npm run dev
```

---

## Environment Variables

### `electrotrack-api/.env`

```env
# ── Database ──────────────────────────────────────────────────────────────────
# Supabase session pooler (port 5432) — compatible with Prisma without pgbouncer flag
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"

# ── JWT ───────────────────────────────────────────────────────────────────────
JWT_SECRET="change-me-long-random-string"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="change-me-another-long-random-string"
JWT_REFRESH_EXPIRES_IN="7d"
JWT_OTP_EXPIRES_IN="2m"

# ── OTP ───────────────────────────────────────────────────────────────────────
OTP_TTL_SECONDS="300"
OTP_LENGTH="6"
# Set true in development — logs OTP to server console, no email required
OTP_LOG_TO_CONSOLE="true"

# ── Email (Nodemailer — Resend SMTP recommended, free 100 emails/day) ─────────
SMTP_HOST="smtp.resend.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="resend"
SMTP_PASS="re_your_resend_api_key"
SMTP_FROM="noreply@yourdomain.com"

# ── Redis (optional) ──────────────────────────────────────────────────────────
REDIS_URL="redis://localhost:6379"

# ── AI (Groq — free tier) ─────────────────────────────────────────────────────
GROQ_API_KEY="gsk_your_groq_key"

# ── App ───────────────────────────────────────────────────────────────────────
NODE_ENV="development"
PORT="3000"
CLIENT_URL="http://localhost:5173"
BCRYPT_ROUNDS="12"
```

### `electrotrack-pos/.env`

```env
VITE_API_URL="http://localhost:3000"
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                 electrotrack-pos (React)                  │
│   Vite · React Router · Zustand · Axios · Tailwind CSS   │
└───────────────────────────┬──────────────────────────────┘
                            │  REST API + WebSocket
┌───────────────────────────▼──────────────────────────────┐
│                electrotrack-api (NestJS)                  │
│                                                           │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌────────┐  │
│  │   Auth   │  │ Inventory │  │  Sales   │  │Reports │  │
│  │ JWT/OTP  │  │ Products  │  │  Cart    │  │  AI    │  │
│  └──────────┘  │  Units    │  │ Invoice  │  └────────┘  │
│                └───────────┘  └──────────┘              │
│                                                           │
│  Prisma ORM ──► PostgreSQL (Supabase)                    │
│  ioredis    ──► Redis (optional)                         │
│  Socket.IO  ──► Real-time broadcast                      │
└──────────────────────────────────────────────────────────┘
```

### Core Data Model

```
Tenant
  └── User[] (role + permissions)
  └── Product[]
        └── InventoryUnit[] (serialNumber, status, condition)
              └── SaleItem (link to Sale)
              └── Return   (link to Sale)
  └── Sale[]
        └── SaleItem[]
  └── Return[]
  └── ShopSettings (thresholds, invoice template)
  └── Customer[]
```

---

## Pros & Cons

### Pros

| | |
|---|---|
| Serial-level tracking | Every unit has its own identity — no ambiguity at sale or warranty claim |
| Multi-tenant SaaS | Full data isolation, platform admin panel, plan enforcement |
| Zero-cost AI | Groq free tier — powerful insights at $0/month |
| OTP dev bypass | `OTP_LOG_TO_CONSOLE=true` — no email server needed for local testing |
| Security-first | CSPRNG OTP, rotating HttpOnly cookie refresh tokens, per-user permissions |
| Premium UX | Dark glassmorphism design — feels premium compared to typical POS software |
| Brandable invoices | Per-tenant logo, colors, font, watermark — no generic receipts |
| Fraud detection | Automatic suspicious-return flagging with configurable thresholds |
| Real-time | WebSocket sales feed — no manual refresh needed |
| PWA ready | Installable, works offline for basic sales via Dexie |

### Cons

| | |
|---|---|
| No native mobile app | PWA works but not a native iOS/Android app — camera scanning can be unreliable |
| Single currency | Hardcoded PKR — multi-currency requires a refactor |
| No payment gateway | Records payment method but does not integrate with card terminals or mobile wallets |
| SMS OTP costs money | No free production SMS — Twilio trial credit only; use email OTP instead |
| Supabase free limits | 500MB DB, 1GB file storage, 2 emails/month (use Resend for OTP email) |
| No multi-location | Single warehouse per tenant — chain stores would need a branch model |
| No barcode printing | Can look up by serial but cannot generate or print barcodes natively |
| No automated tests | Business logic is tested manually — Jest/Playwright tests not yet written |

---

## Challenges We Faced

### 1. Multi-tenant data isolation
Every Prisma query must be scoped by `tenantId`. A missed scope = one tenant reads another's data. Fixed with a `TenantGuard` that extracts `tenantId` from the JWT and a strict `where: { tenantId }` on every query.

### 2. Page refresh redirecting to login
The access token is intentionally not persisted to localStorage (security best practice), but the user object is. On page reload, React rendered `!accessToken` and redirected to `/login` before the `useEffect` could fire the token refresh. Fixed with a `pendingRefresh = user && !accessToken` guard that shows a spinner instead of redirecting.

### 3. Cryptographically weak OTP
Initial implementation used `Math.random()` — predictable by an attacker who observes ~30 outputs (V8's xorshift128+ state recovery). Replaced with `crypto.randomInt()` from Node's built-in `crypto` module.

### 4. OTP Redis split-brain
`generate()` writes to Redis and falls back to in-memory. `verify()` also checks Redis first. If Redis goes down between generate and verify, the code was stored in Redis (now gone) but verify checks in-memory (which has nothing) — OTP never verified. Fixed by having `verify()` check Redis key existence; if absent, fall to memory store. Both paths are now consistent.

### 5. OTP email blocking the flow
`requestOtp` sent email without a try-catch. If SMTP was unconfigured, `sendMail` threw a raw 500 error leaking internal transport details. Wrapped in try-catch; on failure, invalidates the OTP so it doesn't persist undelivered.

### 6. O(n²) sort in dashboard
`getDashboard` sorted "recently added" by calling `products.find()` inside the sort comparator — O(n² log n) for large catalogs. Fixed with a pre-built `Map<id, timestamp>` lookup for O(n log n) total.

### 7. Permission mismatch on return analytics
Backend endpoint required `reports.read` but the frontend route only required `returns.read`. Users with return access got a silent 403. Fixed by aligning the backend guard to `returns.read`.

### 8. Supabase connection string confusion
Supabase has three connection types (direct, session pooler, transaction pooler). The transaction pooler on port 6543 needs `pgbouncer=true`; the session pooler on port 5432 works with Prisma directly. The `P1001` error was the project being paused (free tier), not the connection string.

### 9. Credentials in version control
A plaintext test-credentials file was accidentally tracked by git. Removed from tracking, added to `.gitignore`, passwords rotated.

---

## Who Its For

| User | Value |
|---|---|
| **Electronics shop owner** | Real-time dashboard, fraud detection, staff analytics, full audit trail |
| **Cashier** | Fast POS with search, camera scan, clean invoice |
| **Inventory manager** | Serial-level stock control, GRN receive, dead stock alerts |
| **Accountant** | Cash reconciliation, sales reports, stock valuation |
| **Technician** | Warranty lookup, repair status on unit |
| **Platform operator** | Manage multiple shops from a single admin panel |

---

## Roadmap

- [ ] Resend SDK direct integration (replace nodemailer)
- [ ] SMS OTP via Twilio (phone field on User model)
- [ ] class-validator DTOs for invoice color fields (hex validation)
- [ ] Jest unit tests — auth, OTP, sales, returns
- [ ] Playwright E2E tests for critical POS flows
- [ ] Redis dashboard caching (30s TTL on getDashboard)
- [ ] Barcode label printing
- [ ] Multi-branch / warehouse support
- [ ] Easypaisa / JazzCash payment gateway integration
- [ ] Product image upload (Cloudinary free tier)
- [ ] CSV / Excel export for all reports

---

## License

MIT

---

*Built with NestJS · React · Prisma · Supabase · Groq · GSAP · Tailwind CSS*
