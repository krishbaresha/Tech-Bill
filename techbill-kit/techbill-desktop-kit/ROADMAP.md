# TechBill → Installable, Industry-Grade Desktop App
### Roadmap & implementation guide

Ye kit is repo ke real structure ke hisaab se banaya gaya hai (techbill-api = NestJS,
techbill-pos = React/Vite PWA, Prisma + PostgreSQL, already-existing subscription models).
Neeche 4 phases hain — har phase independently deploy ho sakta hai.

---

## Phase 1 — Desktop installer (Tauri wrap)

**Kyun Tauri, Electron nahi?** Tauri Rust-based hai, installer ~8-15MB hota hai (Electron ka ~100MB+),
RAM bhi kam khaata hai, aur system ka native WebView2 use karta hai — POS terminal jaise low-spec
Windows machines ke liye better fit hai.

Kya add kiya gaya hai (`techbill-pos/src-tauri/`):
- `tauri.conf.json` — window size, CSP (sirf `techbill.app` API se connect hoga, kuch aur nahi),
  bundle targets (Windows NSIS+MSI, macOS DMG)
- `src/main.rs` — single-instance lock (ek machine par ek hi window khule), silent auto-updater check
- `capabilities/default.json` — minimum permissions (updater, dialog, process — filesystem access nahi diya)

**Steps (apne local machine par, Rust install karne ke baad):**
```bash
# ye kit ke files apne repo mein copy karo (isi folder structure mein)
cd techbill-pos
npm install   # PACKAGE_JSON_ADDITIONS.md wale deps add karne ke baad
npm run tauri icon path/to/1024x1024-logo.png
npm run desktop:dev      # test window khulega, localhost:5173 load karega
npm run desktop:build    # installer banega: src-tauri/target/release/bundle/
```

Production mein `devUrl` ki jagah build ke waqt `frontendDist: "../dist"` use hoga (already config mein hai),
matlab final .exe ke andar tumhara poora React app bundled hoga — internet sirf API calls ke liye chahiye,
UI offline bhi khulega (Dexie.js wala offline-sale queue already tumhare paas hai, wo desktop mein bhi kaam karega).

**Important — API base URL:** Desktop build mein `VITE_API_URL` production URL (`https://api.techbill.app`)
par fix honi chahiye (build-time env), kyunki desktop app ke paas apna localhost proxy nahi hoga.

---

## Phase 2 — Security & testing (crash-proof)

Jo already achha hai: `helmet()`, global `ThrottlerModule` (100 req/60s), bcrypt (12 rounds), JWT + refresh
tokens, `ValidationPipe` with whitelist, `AuditLog` model, `CashReconciliation` model. Ye industry-grade
foundation hai, sirf gaps close karne hain:

1. **Login-specific rate limiting** — abhi global throttle 100 req/min hai, lekin login endpoint alag se
   tighter limit (`@Throttle({ default: { limit: 5, ttl: 60000 } })`) deserve karta hai — brute force se bachne ke liye.
2. **Secrets rotation** — `JWT_SECRET`, `JWT_REFRESH_SECRET` production mein `.env` se nikaal kar
   ek secrets manager (Azure Key Vault, ya minimum GitHub Actions encrypted secrets) mein daalo.
3. **Automated tests** — abhi sirf `app.controller.spec.ts` hai. Priority order jahan tests likhne chahiyein
   (business-critical paths pehle):
   - Sale creation + inventory deduction (race conditions yahan sabse zyada nuksaan karte hain)
   - Return/fraud-flag logic
   - Tenant isolation (`TenantGuard`) — ye sabse critical hai kyunki multi-tenant hai; ek test likho
     jo confirm kare Tenant A, Tenant B ka data kabhi na dekh sake
   - OTP/checkout discount gate
4. **Frontend tests** — `vitest` + `@testing-library/react` add kiya hai kit mein; cart/checkout
   component se shuru karo (ye sabse zyada revenue-critical UI hai).
5. CI workflows (`frontend-ci.yml`, `backend-ci.yml`) is kit mein hain — har PR par lint+test+build
   automatically chalega, broken code merge nahi hoga.

---

## Phase 3 — Monitoring (Sentry)

`SENTRY_SETUP.md` dekho. Free tier kaafi hai shuru ke liye (5k errors/month). Ye add karne ke baad
tumhe pata chalega jab kisi shopkeeper ke desktop app mein crash aaye — abhi tumhe pata sirf tab chalta
hoga jab wo phone karega.

Bonus: NestJS `AuditLog` model already hai — usse ek simple `/admin/audit-log` dashboard bana kar
suspicious activity (jaise ek admin baar baar discount limits badal raha ho) bhi track kar sakte ho.

---

## Phase 4 — Licensing & auto-update

Achi baat: tumhare Prisma schema mein already `SubscriptionPlan`, `TenantFeatureOverride`, aur
`TenantLicenseHistory` models hain — backend licensing logic ka base already maujood hai.

Desktop app ke liye jo add karna hoga:
1. **Startup license check** — app khulte hi backend ke `/tenant/license/status` (agar exists nahi karta,
   ek naya endpoint banao) ko call karo; agar `SUSPENDED`/`EXPIRED` hai to ek blocking modal dikhao
   (grace period ke sath — internet down hone par turant lock mat karo, 48h offline grace do).
2. **Auto-update** — `tauri.conf.json` mein `updater` block already configured hai. Karna ye hai:
   ```bash
   npm run tauri signer generate -w ~/.tauri/techbill.key
   ```
   Ye ek public/private keypair dega. Public key `tauri.conf.json` ke `pubkey` field mein daalo,
   private key + password GitHub Secrets mein (`TAURI_SIGNING_PRIVATE_KEY`). Backend/CDN par ek chhota
   endpoint chahiye jo latest version ka JSON manifest serve kare (Tauri docs: "Static/self-hosted updater").
3. **Code signing** (`desktop-release.yml` mein placeholders hain):
   - Windows: ek code-signing certificate chahiye (~$70-300/year, e.g. from SSL.com) — iske bina
     Windows Defender/SmartScreen naye installer ko "Unknown Publisher" warning dega. Shuru mein bina
     signing ke bhi ship kar sakte ho, lekin professional look ke liye zaroori hai.
   - macOS: Apple Developer account ($99/year) + notarization chahiye.

---

## Suggested order

1. Phase 1 pehle karo (installer bante hi tum demo de sakte ho / testing shuru kar sakte ho)
2. Phase 2 parallel mein (tests likhna kabhi bhi start kar sakte ho, blocking nahi hai)
3. Phase 3 ek din ka kaam hai, jaldi kar lo
4. Phase 4 sabse aakhri mein — jab ek working installer already ho, tab signing/auto-update layer chadhao

## Files in this kit
```
techbill-pos/src-tauri/          → Tauri desktop scaffold (copy as-is into your repo)
PACKAGE_JSON_ADDITIONS.md        → exact deps/scripts to merge into techbill-pos/package.json
.github/workflows/desktop-release.yml → builds signed Win/Mac installers on git tag
.github/workflows/frontend-ci.yml     → lint+test+build on every PR
.github/workflows/backend-ci.yml      → replaces backend-build.yml, adds lint+test
SENTRY_SETUP.md                  → error monitoring snippets
```
