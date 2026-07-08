# LEGACY ARCHITECTURE WARNING

This file is a legacy single-tenant build tracker. Do not execute it for the SaaS multi-tenant build.

Please refer to `docs/execution/00_README_EXECUTION_ORDER.md` for the active multi-tenant roadmap, and `ARCHITECTURE.md` for the current system architecture.

---

# TechBill POS — Legacy Build Plan & Historical Progress Tracker

This document details the original phase scoping and endpoint maps used during the early development stages of the single-tenant core logic.

*   **Stack**: NestJS + Prisma + PostgreSQL + Redis | React + Vite + Tailwind + Zustand
*   **Total Endpoints**: 45 REST + 5 WebSocket events

---

## Historical Build Phases

*   **Phase 0** — Project Scaffolding
*   **Phase 1** — Database Schema Design
*   **Phase 2** — Auth Module Implementation
*   **Phase 3** — Inventory Module Implementation
*   **Phase 4** — Sales / Checkout Module
*   **Phase 5** — Returns & Fraud Logic
*   **Phase 6** — Audit Log Subsystem
*   **Phase 7** — WebSocket Gateway Communication
*   **Phase 8** — Analytics Reports Modules
*   **Phase 9** — Frontend client POS Views
*   **Phase 10** — Frontend owner Dashboard views
*   **Phase 11** — Offline PWA Integration (Dexie.js)

---

## Core Endpoint Checklist (45 REST Endpoints)

### Authentication
*   `POST /auth/login` - User login credentials check
*   `POST /auth/refresh` - Rotate JWT credentials
*   `POST /auth/logout` - Invalidate session
*   `POST /auth/request-otp` - Request password reset OTP
*   `POST /auth/verify-otp` - Verify password reset OTP

### Users & Workers Management
*   `GET /users` - List tenant workers
*   `POST /users` - Create new worker
*   `PATCH /users/:id` - Edit worker privileges or roles
*   `DELETE /users/:id` - Deactivate worker

### Products Catalog
*   `GET /products` - List products with inventory counts
*   `POST /products` - Create new product definition
*   `GET /products/:id` - View product specifications
*   `PUT /products/:id` - Edit product specifications
*   `DELETE /products/:id` - Soft delete product definitions

### Inventory & Suppliers
*   `GET /inventory/units` - Retrieve unit serial list
*   `POST /inventory/units` - Register unit serial number
*   `POST /inventory/units/bulk` - Upload CSV serial numbers list
*   `GET /inventory/units/lookup/:serial` - Hotpath serial status query
*   `POST /suppliers` - Register supplier details
*   `POST /purchase-orders` - Create supplier purchase order
*   `POST /grn` - Create Goods Received Note to increment stock

### Sales & Point of Sale
*   `POST /sales` - Run checkout transactions (Prisma transactional scope)
*   `GET /sales` - Retrieve invoice history list
*   `GET /sales/:id/invoice` - PDF receipt export
*   `GET /customers/search?phone=` - Search customer accounts by phone number

### Returns & Audits
*   `POST /returns` - Request a return (flags customer transaction counts for fraud checking)
*   `PATCH /returns/:id/approve` - Authorize return and update database unit status
*   `PATCH /returns/:id/reject` - Reject return and reset unit status
*   `GET /audit-logs` - Query database action logs

---

## WebSocket Gateway Events

### API Gateway Server → Client
*   `sale_created` - Dispatched when checkout transaction succeeds
*   `return_requested` - Dispatched when return is requested
*   `low_stock_alert` - Dispatched when stock count drops below the low threshold
*   `cash_submitted` - Dispatched when cash reconciliations are logged

### Client → Gateway Server
*   `subscribe` - Connect to specific tenant room (`shop_{tenantId}`)
