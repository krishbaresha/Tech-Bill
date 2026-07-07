# TechBill Deployment Guide

Here are the complete, step-by-step manual instructions to get your new TechBill multi-tenant architecture fully live in production. 

> [!NOTE]
> **Regarding your Render `.env` file:** 
> I just pushed another update that makes the WebSockets and the standard API automatically trust **any** `*.techbill.app` and `techbill.app` origin. Because of this dynamic code, **you do NOT strictly need to update the `ALLOWED_ORIGINS` variable in Render anymore!** However, for cleanliness, it is best practice to eventually update it or remove the old Vercel URL.

---

## 1. Domain Configuration (Name.com)
You need to point your domain traffic to Vercel so that Vercel can handle the frontend routing.

1. Log into Name.com and navigate to the DNS Management page for `techbill.app`.
2. Add a **CNAME Record** for the wildcard subdomain:
   - **Type:** `CNAME`
   - **Host:** `*`
   - **Answer/Value:** `cname.vercel-dns.com`
3. Add a **CNAME Record** (or ALIAS/ANAME) for the root domain:
   - **Type:** `CNAME` (or `ALIAS`)
   - **Host:** `@` (or leave blank for root)
   - **Answer/Value:** `cname.vercel-dns.com` (or Vercel's provided A-record IP if Name.com requires an A record for root domains).

## 2. Frontend Configuration (Vercel)
Vercel needs to know to accept traffic for your new domains and issue SSL certificates.

1. Log into your Vercel Dashboard and click on the **TechBill (formerly ElectroTrack)** project.
2. Go to **Settings** > **Domains**.
3. Type in `techbill.app` and click Add.
4. Type in `*.techbill.app` and click Add.
5. Vercel will automatically verify the DNS (from Step 1) and issue wildcard SSL certificates.
6. **Environment Variables**: Go to **Settings** > **Environment Variables**. Ensure that your `VITE_API_URL` correctly points to your live Render backend URL (e.g., `https://your-api.onrender.com`).

## 3. Backend Configuration (Render)
As mentioned above, the backend code handles CORS dynamically now, so changes here are optional but recommended for cleanliness.

1. Log into your Render Dashboard and select your Web Service (the API).
2. Go to **Environment**.
3. (Optional) Update `ALLOWED_ORIGINS` to: `https://techbill.app`
4. Make sure your database connection strings (`DATABASE_URL`) are still correct.
5. **No further action is required**. Render automatically rebuilds and deploys every time you push to GitHub.

---

### Verification
Once Vercel shows the domains as "Valid" (green checkmarks) and Render finishes its latest deployment, you can test the system:
1. Go to `https://techbill.app/login`.
2. Log in with an owner or staff account.
3. You should be automatically redirected to `https://[your-shop-name].techbill.app/dashboard` with a secure, valid session!
