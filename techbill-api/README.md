# TechBill Backend API Service (`electrotrack-api`)

This directory contains the NestJS-based backend REST API and WebSocket Gateway for **TechBill**, a high-scale multi-tenant Enterprise Resource Planning (ERP) and Invoice Management SaaS.

---

## Technical Stack & Infrastructure
*   **Application Framework**: NestJS 11
*   **Database Client**: Prisma 5 ORM
*   **Database Target**: PostgreSQL (Supabase with connection poolers)
*   **Caching & Queue Layer**: Redis via `ioredis`
*   **Real-time Layer**: Socket.IO WebSockets Server
*   **Mailing Transport**: Nodemailer (Resend SMTP configuration)
*   **AI Integration**: Groq SDK (`llama-3.3-70b-versatile` model)

---

## Prerequisites
*   Node.js 20+
*   NPM 10+
*   PostgreSQL DB
*   Redis server (optional; falls back to an in-memory database store if `REDIS_URL` is omitted)

---

## Project Setup

### 1. Installation
Install project dependencies:
```bash
npm install
```

### 2. Configuration
Create a `.env` file in this directory based on the `.env.example` file:
```bash
cp .env.example .env
```
Fill out the parameters (Database endpoints, JWT secrets, Resend API key, and Groq Cloud key).

### 3. Database Migration
Apply the Prisma schema migrations to your database:
```bash
npx prisma migrate dev
```

### 4. Database Seeding
Populate initial tables with standard tenant environments, product listings, and administrative accounts:
```bash
npm run db:seed
```

---

## Execution Command Registry

```bash
# Start backend in development mode (watch mode)
npm run start:dev

# Start backend in debug mode
npm run start:debug

# Build the project for production
npm run build

# Start the compiled production service
npm run start:prod
```

---

## Testing Workflows

```bash
# Execute Jest unit tests
npm run test

# Execute e2e integration tests
npm run test:e2e

# Execute code test coverage report
npm run test:cov
```

---

## System Health & Verification
*   **Endpoint**: `GET /health`
*   **Objective**: Confirm database accessibility, current server uptime, and configuration health.
*   **Sample Payload**:
    ```json
    {
      "status": "ok",
      "uptime": 612.4,
      "timestamp": "2026-07-08T09:18:00.000Z"
    }
    ```
