# ElectroTrack Deployment Guide

## Architecture

```mermaid
graph LR
  U["User Browser"] --> V["Vercel (Frontend)"]
  V --> R["Render (Backend API)"]
  R --> DB["Supabase PostgreSQL"]
  R --> RS["Resend SMTP"]
```

| Component | Platform | Directory |
|-----------|----------|-----------|
| Frontend (React + Vite) | **Vercel** | `electrotrack-pos/` |
| Backend (NestJS) | **Render** | `electrotrack-api/` |

---

## 🐛 Bugs Fixed Before Deployment

The following TypeScript errors were **blocking the Vercel build** (`tsc -b && vite build` would fail):

| File | Error | Fix |
|------|-------|-----|
| `supabase.ts`, `supabase-auth.store.ts`, `AuthProvider.tsx`, `useAuth.ts` | `@supabase/supabase-js` not installed — TS2307 | Deleted (dead code — app uses `auth.store` with NestJS JWT) |
| `ProtectedRoute.tsx` | Imported deleted `supabase-auth.store` | Rewrote to use `auth.store` |
| `ExpensesPage.tsx` | Unused `loading` variable — TS6133 | Prefixed with `_` |
| `PosScreen.tsx` | Unused `CartItem` import — TS6196 | Removed import |
| `PosScreen.tsx` | `PaymentForm` passed props it doesn't accept — TS2322 | Removed extra props |
| `ReportsPage.tsx` | `topProducts` doesn't exist on `SalesSummary` — TS2339 | Changed to `soldProducts` |
| `ReportsPage.tsx` | Implicit `any` on `.map()` callback — TS7006 | Added explicit types |
| `vite.config.ts` | `self` not found — TS2304 | Replaced with pathname check |

> [!IMPORTANT]
> Build now passes cleanly: `tsc -b && vite build` ✅

---

## Part 1 — Deploy Frontend to Vercel

### Step 1: Import the Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select the **`krishbaresha/electrotrack-saas`** repo from GitHub
4. Vercel will detect it as a monorepo

### Step 2: Configure Project Settings

In the Vercel project settings, set these values:

| Setting | Value |
|---------|-------|
| **Framework Preset** | `Vite` |
| **Root Directory** | `electrotrack-pos` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |
| **Node.js Version** | `18.x` or `20.x` |

> [!TIP]
> Click **"Edit"** next to Root Directory and type `electrotrack-pos`. This tells Vercel to only build the frontend subdirectory.

### Step 3: Set Environment Variables

In Vercel → **Project Settings → Environment Variables**, add:

| Key | Value | Example |
|-----|-------|---------|
| `VITE_API_URL` | Your Render backend URL | `https://electrotrack-api.onrender.com` |
| `VITE_WS_URL` | Same as API URL (WebSocket) | `https://electrotrack-api.onrender.com` |

> [!CAUTION]
> Do **NOT** add a trailing slash to the URLs. Use `https://electrotrack-api.onrender.com` not `https://electrotrack-api.onrender.com/`.

### Step 4: Deploy

Click **"Deploy"**. Vercel will:
1. `cd electrotrack-pos`
2. `npm install`
3. `npm run build` → runs `tsc -b && vite build`
4. Serve the `dist/` directory as static files

### Step 5: Note Your Vercel URL

After deploy, copy your Vercel URL (e.g. `https://electrotrack-pos.vercel.app`). You'll need this for the backend CORS config.

---

## Part 2 — Deploy Backend to Render

### Step 1: Create a Web Service

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **"New +" → "Web Service"**
3. Connect the **same GitHub repo** (`krishbaresha/electrotrack-saas`)

### Step 2: Configure Service Settings

| Setting | Value |
|---------|-------|
| **Name** | `electrotrack-api` |
| **Root Directory** | `electrotrack-api` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npx prisma generate && npm run build` |
| **Start Command** | `node dist/src/main` |
| **Node Version** | Set `NODE_VERSION` env var to `20` |

> [!IMPORTANT]
> The build command must include `npx prisma generate` before `npm run build` to generate the Prisma client. Without it, the app crashes on startup.

### Step 3: Set Environment Variables

In Render → **Environment**, add these variables:

| Key | Value |
|-----|-------|
| `PORT` | `3000` (or let Render assign) |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://your-app.vercel.app` |
| `DATABASE_URL` | `postgresql://postgres.mlxopjdfjbdmiovnhugp:...@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres` |
| `JWT_SECRET` | Your JWT secret |
| `JWT_REFRESH_SECRET` | Your JWT refresh secret |
| `JWT_ACCESS_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `JWT_OTP_EXPIRES_IN` | `2m` |
| `OTP_TTL_SECONDS` | `300` |
| `OTP_LENGTH` | `6` |
| `SMTP_HOST` | `smtp.resend.com` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `SMTP_USER` | `resend` |
| `SMTP_PASS` | Your Resend API key (e.g. `re_VUVntdV5_...`) |
| `SMTP_FROM` | `ElectroTrack <noreply@yourdomain.com>` |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` |
| `BCRYPT_ROUNDS` | `12` |
| `GROK_API_KEY` | Your Groq API key |
| `SHOP_NAME` | `My Electronics Shop` |
| `DEFAULT_LOW_STOCK_THRESHOLD` | `2` |

> [!WARNING]
> **Resend SMTP**: The `SMTP_FROM` email address domain **must be verified** in your Resend dashboard. Go to [resend.com/domains](https://resend.com/domains) to verify it. If using the free tier, you can only send from `onboarding@resend.dev`.

### Step 4: Deploy

Click **"Create Web Service"**. Render will build and deploy automatically.

---

## Part 3 — Post-Deployment Checklist

### ✅ Update CORS on Render

Once you have your Vercel URL, update the `ALLOWED_ORIGINS` env var on Render:

```
ALLOWED_ORIGINS=https://your-app.vercel.app
```

If you have multiple origins (e.g., a custom domain + Vercel preview):
```
ALLOWED_ORIGINS=https://your-app.vercel.app,https://electrotrack.app
```

### ✅ Update `VITE_API_URL` on Vercel

Once Render deploy is live, update the Vercel env vars with the actual Render URL:

```
VITE_API_URL=https://electrotrack-api.onrender.com
VITE_WS_URL=https://electrotrack-api.onrender.com
```

> [!NOTE]
> After changing env vars on Vercel, you must **redeploy** for changes to take effect. Go to **Deployments → ⋯ → Redeploy**.

### ✅ Run Prisma Migrations

If this is the first deploy, SSH into Render shell or use the **Shell** tab:
```bash
npx prisma migrate deploy
```

### ✅ Seed the Database (First Time)

```bash
npx prisma db seed
```

### ✅ Test the Connection

1. Open your Vercel URL
2. Try logging in
3. Check browser DevTools → Network tab for API calls hitting your Render URL
4. If you see CORS errors, double-check `ALLOWED_ORIGINS` on Render

### ✅ Verify Resend Emails

1. Trigger an OTP login
2. Check the Resend dashboard at [resend.com/logs](https://resend.com/logs) for delivery logs
3. If emails fail, verify your domain in Resend and check `SMTP_FROM` matches

---

## Vercel Config File Reference

Your [vercel.json](file:///d:/electrotrack-saas/electrotrack-pos/vercel.json) is already set up correctly for SPA routing:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

This ensures all routes (e.g., `/pos`, `/dashboard`) serve `index.html` so React Router handles them client-side.

---

## Quick Commands Summary

```bash
# Commit and push fixes
cd d:\electrotrack-saas
git add .
git commit -m "Fix TypeScript errors for Vercel deployment"
git push

# Both Vercel and Render will auto-deploy on push (if connected to GitHub)
```
