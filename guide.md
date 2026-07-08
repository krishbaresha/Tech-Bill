# TechBill Production Deployment Guide

This guide details the step-by-step instructions required to deploy the TechBill multi-tenant SaaS application to production.

---

## Architecture Diagram

```mermaid
graph LR
  User["Client Browser (*.techbill.app)"] --> Vercel["Vercel Frontend Hosting"]
  Vercel --> Render["Render API Backend (api.techbill.app)"]
  Render --> Supabase["Supabase PostgreSQL DB"]
  Render --> Redis["Upstash / Redis Caching"]
  Render --> Resend["Resend SMTP Services"]
```

| Deployment Segment | Platform Provider | Source Subdirectory | Production URL |
|--------------------|-------------------|---------------------|----------------|
| **Frontend SPA**   | Vercel            | `techbill-pos/`     | `https://techbill.app` |
| **Backend REST API**| Render            | `techbill-api/`     | `https://api.techbill.app` |

---

## Part 1 — Domain Configuration (Name.com)

To support multi-tenant wildcard subdomains (e.g., `alpha.techbill.app`, `beta.techbill.app`), the root domain DNS records must route requests properly to Vercel.

1.  Log into your **Name.com** domain registrar.
2.  Navigate to DNS Management for **`techbill.app`**.
3.  Add the following records:

| Record Type | Host / Name | Answer / Destination Value | TTL |
|-------------|-------------|----------------------------|-----|
| `CNAME`     | `*`         | `cname.vercel-dns.com.`    | 300 |
| `CNAME`     | `@` (root)  | `cname.vercel-dns.com.`    | 300 |
| `CNAME`     | `api`       | `your-api.onrender.com.`   | 300 |

---

## Part 2 — Deploy Frontend to Vercel

Vercel serves the React SPA assets and handles dynamic wildcard subdomain routing.

### Step 1: Project Scaffolding
1.  Go to [Vercel Dashboard](https://vercel.com/new).
2.  Import the Git repository: **`krishbaresha/Tech-Bill`**.
3.  Vercel will detect the workspace.

### Step 2: Configure Workspace Settings
Set these exact values in the Vercel setup window:

*   **Framework Preset**: `Vite`
*   **Root Directory**: `techbill-pos` (Click "Edit" and type `techbill-pos` to direct Vercel to compile only the frontend subdirectory)
*   **Build Command**: `npm run build`
*   **Output Directory**: `dist`
*   **Install Command**: `npm install`
*   **Node.js Version**: `20.x`

### Step 3: Environment Variables
Add the following key-value pairs:

| Variable Name | Description | Production Value |
|---------------|-------------|------------------|
| `VITE_API_URL`| Production Backend API Endpoint | `https://api.techbill.app` |

> [!WARNING]
> Do **NOT** add trailing slashes to API endpoints. Use `https://api.techbill.app`, not `https://api.techbill.app/`.

### Step 4: Wildcard Domain Attachment
1.  Once deployed, navigate to **Project Settings → Domains** in Vercel.
2.  Add **`techbill.app`**.
3.  Add **`*.techbill.app`** (Ensure wildcard support is active; Vercel will auto-generate SSL certificates for all dynamic subdomains using Let's Encrypt).

---

## Part 3 — Deploy Backend to Render

Render hosts the NestJS web service, WebSocket gateway, and executes database migrations.

### Step 1: Create Web Service
1.  Navigate to [dashboard.render.com](https://dashboard.render.com).
2.  Click **New + → Web Service**.
3.  Connect the Git repository: **`krishbaresha/Tech-Bill`**.

### Step 2: Configure Service Parameters
Configure the service with these settings:

*   **Name**: `techbill-api`
*   **Root Directory**: `techbill-api`
*   **Runtime**: `Node`
*   **Build Command**: `npm install && npx prisma generate && npm run build`
*   **Start Command**: `node dist/main`

### Step 3: Define System Environment Variables
Add the following parameters under the Render Service **Environment** settings:

| Variable Name | Recommended Production Setting |
|---------------|--------------------------------|
| `NODE_VERSION`| `20` |
| `NODE_ENV`    | `production` |
| `PORT`        | `3000` |
| `DATABASE_URL`| `postgresql://postgres.[username]:[password]@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres` |
| `JWT_SECRET`  | *High-entropy random key string* |
| `JWT_REFRESH_SECRET` | *High-entropy random key string* |
| `JWT_ACCESS_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN`| `7d` |
| `JWT_OTP_EXPIRES_IN`    | `2m` |
| `SMTP_HOST`   | `smtp.resend.com` |
| `SMTP_PORT`   | `465` |
| `SMTP_SECURE` | `true` |
| `SMTP_USER`   | `resend` |
| `SMTP_PASS`   | *Your Resend API Key* |
| `SMTP_FROM`   | `TechBill <noreply@techbill.app>` |
| `ALLOWED_ORIGINS`| `https://techbill.app,https://*.techbill.app` |
| `BCRYPT_ROUNDS`| `12` |
| `GROQ_API_KEY`| *Your Groq Cloud API Key* |

---

## Part 4 — Post-Deployment Verification

### 1. Database Migrations
Run production migrations by connecting to the Render shell or locally using the production connection string:
```bash
npx prisma migrate deploy
npx prisma db seed
```

### 2. Verify Health Check
Ensure the backend API responds successfully:
```bash
curl -I https://api.techbill.app/health
```
**Expected Response**:
*   Status Code: `200 OK`
*   Body: `{ "status": "ok", "uptime": ..., "timestamp": ... }`

### 3. DNS Wildcard & Routing Verification
Go to `https://alpha.techbill.app/login` in your web browser. You should be served the frontend SPA cleanly. Logging in should authenticate against `https://api.techbill.app/auth/login` and establish a secure tenant session.
