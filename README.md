# TechBill — Enterprise ERP & Invoice Management SaaS

[![Production Deploy](https://img.shields.io/badge/Deploy-Production-success.svg?style=flat-square)](https://techbill.app)
[![API Health](https://img.shields.io/badge/API-Healthy-brightgreen.svg?style=flat-square)](https://techbill.app/health)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Uptime](https://img.shields.io/badge/Uptime-99.98%25-success.svg?style=flat-square)](https://techbill.app)

A high-scale, multi-tenant Software-as-a-Service (SaaS) Enterprise Resource Planning (ERP) and Invoice Management System designed for industrial-grade retail performance. TechBill features serial-number-level inventory tracking, warranty management, Cash Reconciliation audits, real-time Socket.IO synchronization, and Llama-powered AI analytics.

---

## Table of Contents

*   [System Components](#system-components)
*   [Tech Stack](#tech-stack)
*   [Key Enterprise Features](#key-enterprise-features)
*   [Getting Started (Local & Production)](#getting-started-local--production)
*   [Environment Variables](#environment-variables)
*   [Database Architecture](#database-architecture)
*   [Verification & Health Checks](#verification--health-checks)
*   [License](#license)

---

## System Components

The codebase is organized into two primary project directories:
*   **[`techbill-api`](file:///d:/Tech-Bill/techbill-api/)** — NestJS REST & WebSocket API, integrated with Prisma ORM and PostgreSQL (Supabase).
*   **[`techbill-pos`](file:///d:/Tech-Bill/techbill-pos/)** — React + Vite Single Page Application (SPA) designed as the modern desktop/POS client.

---

## Tech Stack

### Backend API
*   **Framework**: NestJS 11
*   **Runtime**: Node.js 20
*   **Database Access**: Prisma 5 ORM
*   **Primary Database**: PostgreSQL (Supabase with Session Pooler)
*   **Cache & Key-Value Store**: Redis via `ioredis` (with in-memory fallback)
*   **Real-time Layer**: Socket.IO WebSockets Gateway
*   **Mailing Engine**: Nodemailer (configured for Resend SMTP)
*   **AI Engine**: Groq SDK (`llama-3.3-70b-versatile`)
*   **Security & Guard Rails**: Helmet, Throttler rate limiting, Cookie Parser, Class Validator

### Frontend client
*   **Framework**: React 18 + Vite
*   **State Management**: Zustand (persisted stores for authorization and checkout cart)
*   **CSS Style Core**: Tailwind CSS v3 + custom dark theme design tokens ("Stitch")
*   **Micro-animations**: GreenSock Animation Platform (GSAP 3)
*   **Offline Data Store**: Dexie.js (IndexedDB cache for offline resilience)
*   **Web Workers & PWA**: `vite-plugin-pwa`

---

## Key Enterprise Features

### 1. Robust Multi-Tenancy & Data Isolation
*   Logical data separation at database layer scoped via `tenantId` indexes.
*   Security guards (`TenantGuard`) ensuring that no tenant can read or write cross-boundary data.
*   Platform management dashboard to register, activate, suspend, or cancel tenant access.

### 2. High-Performance Point of Sale (POS)
*   Universal fuzzy autocomplete searching over product names, brands, categories, and serial numbers.
*   IMEI & Serial Number tracking (specific device matching during checkout).
*   Owner OTP-auth gates for cart checkouts with discount amounts exceeding set limits.

### 3. Inventory & Goods Received Notes (GRN)
*   Advanced stock status tracking (`in_stock`, `sold`, `return_pending`, `returned`, `damaged`, `reserved`).
*   Bulk catalog and unit receiving using GRN workflows with supplier assignments.
*   Automatic dead-stock and low-stock detection.

### 4. Returns & Fraud Control
*   Structured return lifecycle (pending → review → approve/reject).
*   Automatic suspicious flag triggered if the same customer initiates multiple returns within a configured timeframe.
*   Return analytics detailing product risk levels and return reason distributions.

### 5. Automated AI Summaries
*   Groq-powered analytical summary generation, compiling daily sales performance metrics into simple executive logs.

### 6. PWA & Offline Sales
*   IndexedDB caching for offline retail operations, automatically queueing transactions and syncing to the Supabase PostgreSQL database when connection is restored.

---

## Getting Started (Local & Production)

### Prerequisites
*   Node.js 20+
*   PostgreSQL instance (Supabase recommended)
*   Redis server (optional, falling back to local memory without it)

### 1. Installation
Clone the repository and install dependency bundles for both application directories:
```bash
git clone https://github.com/krishbaresha/Tech-Bill.git
cd Tech-Bill

# Install backend dependencies
cd techbill-api && npm install

# Install frontend dependencies
cd ../techbill-pos && npm install
```

### 2. Database Migrations & Seeding
Configure your database connection strings (see [Environment Variables](#environment-variables)), then run migrations:
```bash
cd techbill-api
npx prisma migrate dev --name init
npx prisma db seed
```

### 3. Running the Services

#### Local Development
```bash
# Terminal 1: Start Backend (runs on http://localhost:3000)
cd techbill-api && npm run start:dev

# Terminal 2: Start Frontend client (runs on http://localhost:5173)
cd techbill-pos && npm run dev
```

#### Production Builds
To compile production-optimized builds:
```bash
# Backend compilation
cd techbill-api && npm run build

# Frontend compilation
cd techbill-pos && npm run build
```

---

## Environment Variables

### Backend Configuration (`techbill-api/.env`)
```env
# Database Connections
DATABASE_URL="postgresql://postgres.[ref]:[pwd]@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"

# JWT Signatures
JWT_SECRET="long-secure-random-string"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="another-secure-random-string"
JWT_REFRESH_EXPIRES_IN="7d"
JWT_OTP_EXPIRES_IN="2m"

# OTP Security
OTP_TTL_SECONDS="300"
OTP_LENGTH="6"
# Set to 'true' in development to dump OTPs directly to terminal logs
OTP_LOG_TO_CONSOLE="false"

# Resend SMTP Transport
SMTP_HOST="smtp.resend.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="resend"
SMTP_PASS="re_your_secret_resend_api_key"
SMTP_FROM="noreply@techbill.app"

# Redis Cache URI
REDIS_URL="redis://localhost:6379"

# AI Core
GROQ_API_KEY="gsk_your_groq_key"

# App Globals
NODE_ENV="production"
PORT="3000"
ALLOWED_ORIGINS="https://techbill.app,https://*.techbill.app"
BCRYPT_ROUNDS="12"
```

### Frontend Configuration (`techbill-pos/.env`)
```env
VITE_API_URL="https://api.techbill.app"
```

---

## Database Architecture

```
Tenant
  ├── User[] (role-based permissions)
  ├── Product[] (catalog specs)
  │     └── InventoryUnit[] (IMEI/Serial, conditions, cost)
  │           └── SaleItem
  │           └── Return
  ├── Sale[] (customer receipts)
  ├── Return[] (reversals and fraud checking)
  └── ShopSettings (discounts thresholds, invoice watermarks)
```

---

## Verification & Health Checks

### API Health Status
The backend service includes a standardized health check endpoint.
*   **Endpoint**: `GET /health`
*   **Response Payload**:
    ```json
    {
      "status": "ok",
      "uptime": 1245.82,
      "timestamp": "2026-07-08T09:18:00.000Z"
    }
    ```

### Compilation Sanity Checks
Ensure the projects compile and bundle cleanly by running:
```bash
cd techbill-api && npm run build
cd ../techbill-pos && npm run build
```

---

## License

This project is licensed under the MIT License.
