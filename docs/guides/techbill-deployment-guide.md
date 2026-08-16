# TechBill Production Deployment Checklist

This document provides a concise, step-by-step checklist to deploy the TechBill multi-tenant architecture into a production environment.

---

## 1. Domain Configuration (Name.com)

Configure DNS records to point your custom domain traffic to Vercel and Render.

*   [ ] Log into your **Name.com** account and select the **`techbill.app`** domain.
*   [ ] Add a wildcard subdomain **CNAME Record**:
    *   **Type**: `CNAME`
    *   **Host**: `*`
    *   **Value**: `cname.vercel-dns.com`
*   [ ] Add a root domain **CNAME / ALIAS Record**:
    *   **Type**: `CNAME` (or `ALIAS`)
    *   **Host**: `@`
    *   **Value**: `cname.vercel-dns.com`
*   [ ] Add a backend sub-domain **CNAME Record**:
    *   **Type**: `CNAME`
    *   **Host**: `api`
    *   **Value**: *Your Render API URL* (e.g. `techbill-api.onrender.com`)

---

## 2. Frontend Configuration (Vercel)

*   [ ] Import the **`krishbaresha/Tech-Bill`** repository into Vercel.
*   [ ] Configure Project Settings:
    *   **Framework Preset**: `Vite`
    *   **Root Directory**: `techbill-pos`
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `dist`
    *   **Install Command**: `npm install`
*   [ ] Add Environment Variables:
    *   `VITE_API_URL` = `https://api.techbill.app`
*   [ ] Attach domains under Settings > Domains:
    *   Add `techbill.app`
    *   Add `*.techbill.app`
*   [ ] Trigger a production build.

---

## 3. Backend Configuration (Render)

*   [ ] Create a new **Web Service** pointing to the **`krishbaresha/Tech-Bill`** repo.
*   [ ] Configure Settings:
    *   **Name**: `techbill-api`
    *   **Root Directory**: `techbill-api`
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install && npx prisma generate && npm run build`
    *   **Start Command**: `node dist/main`
*   [ ] Add Environment Variables:
    *   `DATABASE_URL` = *Your Supabase PostgreSQL Transaction Connection URL*
    *   `JWT_SECRET` = *Secure JWT key*
    *   `JWT_REFRESH_SECRET` = *Secure refresh token key*
    *   `SMTP_HOST` = `smtp.resend.com`
    *   `SMTP_PORT` = `465`
    *   `SMTP_SECURE` = `true`
    *   `SMTP_USER` = `resend`
    *   `SMTP_PASS` = *Resend API Key*
    *   `SMTP_FROM` = `TechBill <noreply@techbill.app>`
    *   `ALLOWED_ORIGINS` = `https://techbill.app,https://*.techbill.app`
    *   `GROQ_API_KEY` = *Groq API Key*
*   [ ] Launch the Web Service.

> [!NOTE]
> The backend server dynamically matches CORS origins ending with `.techbill.app` or equal to `https://techbill.app`. Setting `ALLOWED_ORIGINS` is best practice for fallback configurations.

---

## 4. Database Setup & Verification

*   [ ] Access the Render terminal and apply database schemas:
    ```bash
    npx prisma migrate deploy
    ```
*   [ ] Seed the base system data (tenants, roles, and platform administrator accounts):
    ```bash
    npx prisma db seed
    ```
*   [ ] Verify the health-check endpoint:
    ```bash
    curl -I https://api.techbill.app/health
    ```
