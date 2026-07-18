# Running & testing TechBill locally

Covers `techbill-api` (NestJS backend) and `techbill-pos` (React frontend +
its Tauri desktop shell). `README.md` already has a general "Getting
Started" section — this file is narrower: exact local commands, the
automated test suites, and step-by-step verification for the three fixes
made on 2026-07-17 (account-switch/logout bug, on-disk crash logging, the
license-signing key).

---

## 1. Prerequisites

- Node.js 20+
- Rust + Cargo, only if you want to run the **desktop** (Tauri) build —
  the browser dev server doesn't need it. Confirmed installed on this
  machine: `rustc 1.97.0`, `cargo 1.97.0`.
- SSH access to the Azure VM Postgres (credentials already in
  `scratch/tunnel.js`) — needed unless you point `techbill-api/.env` at the
  Supabase option instead.

## 2. First-time setup

```bash
cd Tech-Bill
npm install                          # root scripting deps (ssh2, prisma)
cd techbill-api && npm install
cd ../techbill-pos && npm install
```

**`techbill-api/.env`** must have `LICENSE_SIGNING_PRIVATE_KEY` set to a
real 64-hex-char value — a placeholder key was found there on 2026-07-17
(see §5 below) and should already be replaced. Without it, the API throws
on startup with `LICENSE_SIGNING_PRIVATE_KEY is not set`.

**`techbill-pos/.env`** — set this explicitly for local testing:
```env
VITE_API_URL="http://localhost:3000"
```
Without it, the frontend's built-in fallback points at a **remote** host
(`https://electrotrack-saas.onrender.com` — see `src/api/client.ts:6`), so
your local API changes would silently not be exercised at all. This is easy
to miss — check it first if something you just fixed on the backend doesn't
seem to take effect.

## 3. Running it

**Terminal 1 — DB tunnel** (skip if using the Supabase option in `.env` instead):
```bash
node scratch/tunnel.js
```
Leave this running. It forwards the VM's Postgres to `localhost:5432`.

**Terminal 2 — backend**:
```bash
cd techbill-api
npm run start:dev
```
Watch for two lines on startup: `API is running...` and
`Logs are being written to <path>` — the second one is new (§5.2) and tells
you exactly where to look if something crashes later.

**Terminal 3 — frontend, pick one:**
```bash
# Browser (fastest iteration)
cd techbill-pos
npm run dev                 # http://localhost:5173

# OR the desktop app (Tauri) — what the account-switch fix actually applies to
cd techbill-pos
npm run desktop:dev         # opens a native window
```

## 4. Automated test suites

Run these before considering any change done — same bar the project's own
`CLAUDE_CODE_INSTRUCTIONS.md` sets ("sab pass hona chahiye, tabhi
commit/push karo"):

```bash
# Backend
cd techbill-api
npm run lint
npm run test
npm run build

# Frontend
cd techbill-pos
npm run typecheck
npm run test
npm run build
```

**End-to-end (Playwright)** — needs both servers running (Terminal 2 + a
browser-mode Terminal 3) and a staging test account, never a real shop's:
```bash
cd techbill-pos
npx playwright install --with-deps chromium   # one-time

# create techbill-pos/.env.e2e:
#   E2E_TEST_EMAIL=test@techbill.app
#   E2E_TEST_PASSWORD=xxxxx
#   E2E_TEST_PRODUCT_NAME=Sample Product   # must exist in the staging catalog

npx playwright test              # headless
npx playwright test --ui         # step through interactively
npx playwright show-report       # HTML report + screenshots/video from the last run
```
(`npm run test:e2e` isn't wired up as an npm script yet — use `npx
playwright test` directly, per `tests/e2e/README.md`.)

## 5. Verifying the 2026-07-17 fixes

### 5.1 Account-switch / logout bug (desktop app only)

The bug only reproduced inside the **packaged Tauri window** (browser mode
was never affected), so test it there:

1. `npm run desktop:dev` (Terminal 3 above).
2. Log in as any user.
3. Click **Sign out** (or lock the screen via the PIN lock, then log out
   from the lock screen).
4. **Expected now**: you land back on the login screen inside the same
   window, and can log in as a different user immediately.
   **Before the fix**: the window would try to navigate to
   `http://localhost:5173/login` (or similar) and get stuck — no dev server
   is listening there in a built app, so you'd see a blank/broken screen
   with no way back except restarting the app.
5. Also worth checking: lock the screen (PIN), then log out from the lock
   overlay specifically (`LockOverlay.tsx`'s own logout button) — this had
   a *second*, slightly different bug (dead-ended for more hostnames than
   just Tauri) that was fixed at the same time.

### 5.2 Crash logging

**Backend** — trigger something that logs, then check the file:
```bash
# while techbill-api is running, hit any endpoint, e.g.:
curl http://localhost:3000/health

# then check today's log file (path was also printed at startup):
cat techbill-api/logs/api-$(date +%Y-%m-%d).log
```
To specifically test the crash path (uncaught exception), you'd need to
trigger an unhandled error in a running request — not something to do
against a real flow casually, but the handler is
`process.on('uncaughtException', ...)` in `techbill-api/src/main.ts` if you
want to read it directly instead.

**Desktop app**:
```bash
# Windows log path (identifier from tauri.conf.json):
%LOCALAPPDATA%\app.techbill.desktop\logs\techbill-pos.log
```
1. Run `npm run desktop:dev`.
2. Open devtools (right-click → Inspect Element — available in dev
   builds) and run in the console: `throw new Error('test crash logging')`.
3. Check the log file above — you should see a `[webview]` target error
   line with that message. This exercises the same path a real unhandled
   JS error or promise rejection would (`bootstrap.ts`'s `window.onerror`/
   `unhandledrejection` listeners, or `ErrorBoundary.componentDidCatch` if
   it happens during a React render).

### 5.3 License signing key

```bash
cd techbill-api
grep LICENSE_SIGNING_PRIVATE_KEY .env
```
Should be a 64-character hex string, **not**
`7465636862696c6c2d6465736b746f702d70726f2d6465762d73656564212121` (that
was the placeholder found on 2026-07-17 — see the memory note on this if
you're picking this back up later). This only affects local `.env`; the
production VM's value has not been checked from this environment and needs
verifying separately.

---

## Not covered here (still open)

- **Per-shop licensing** — scoped but not implemented; needs a live-DB
  migration + your explicit go-ahead first.
- **A general end-user "how to use TechBill" guide** — this file is about
  running/testing the code, not day-to-day usage; ask for that separately
  once the pending items above are settled.
