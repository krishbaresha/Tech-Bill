# TechBill Deployment & Migration Memory Log
*Created on July 2026*

This document serves as a historical memory log of the entire migration from Supabase to a standalone self-hosted architecture on Azure and Vercel.

## 1. Database & Infrastructure
* **Azure VM Details:** We are currently running the backend on an Azure VM (`4.193.188.145`). You successfully scaled this down to a highly optimized **1 GB RAM** (B1s) tier which currently uses ~550 MB total.
* **Database Host:** The database was fully migrated away from Supabase. We set up a native PostgreSQL 16 instance inside a Docker container named `techbill_postgres` on the Azure VM.
* **Credentials:** The database is `techbill_db`, operated by the `techbill_admin` user.

## 2. Backend API (NestJS)
* **Hosting:** The NestJS codebase (`techbill-api`) was cloned to the VM (`/home/techbill_admin/techbill/electrotrack-api`).
* **Process Manager:** The backend runs persistently using **PM2** under the name `electrotrack-backend`.
* **CORS & Env:** We injected all production environment variables (including auto-generated `JWT_SECRET`s) securely via PM2. We configured the backend to specifically allow cross-origin requests from the Vercel frontend.

## 3. Security & Networking
* **SSL Certificate:** Since browsers block HTTP requests from HTTPS frontends (Mixed Content), we attached a free dynamic DNS (`4.193.188.145.nip.io`) to your VM.
* **Let's Encrypt:** We ran Certbot to generate a production SSL certificate for that domain.
* **Firewalls:** We opened ports `80` and `443` on both the internal Ubuntu OS firewall (`ufw`) and the outer Azure Network Security Group (NSG).
* **Nginx:** We configured Nginx as a reverse proxy to route traffic from port 80/443 directly to the PM2 backend running on port 8000.

## 4. Frontend (Vercel)
* **Supabase Extermination:** We stripped all `@supabase/supabase-js` logic out of the POS cache store (`pos.store.ts`) and removed the library entirely.
* **Deployment Fixes:** We resolved TypeScript unused variable errors, and we fixed the Vercel missing `public` folder error by explicitly overriding the Output Directory to `dist`.
* **Multi-Domain Routing:** We temporarily commented out the absolute domain redirects (`admin.techbill.app`, etc.) in `Login.tsx` and forced relative routing so testing on Vercel subdomains works perfectly.
* **Environment Variables:** The frontend connects securely to `https://4.193.188.145.nip.io`.

## 5. Automated Backups
* **Cron Job:** We created a fully automated backup script located at `/home/techbill_admin/backup.sh`.
* **Schedule:** The root `crontab` executes this script every single night at **2:00 AM**.
* **Storage:** Backups are dumped from the Docker container as `.sql` files into `/home/techbill_admin/backups/`.
* **Retention:** To prevent the 30 GB VM disk from filling up, the script automatically deletes any backups older than 7 days.

---
**Status:** The system is 100% migrated, live, backed-up, and secure!
