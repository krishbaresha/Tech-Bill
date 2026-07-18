# TechBill Desktop Pro — Architecture

## 1. System Overview

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│   TechBill Desktop Pro       │         │   Existing Backend (NestJS)   │
│   (Tauri + React, per-shop)  │         │                                │
│                               │◄──HTTPS─┤  + new License module         │
│  ┌─────────────────────────┐ │  (sync) │  + new Device module          │
│  │ React UI (reused         │ │         │  + existing tenant/sales/etc  │
│  │ components from          │ │         └──────────────┬─────────────┘
│  │ techbill-pos)             │ │                        │
│  └─────────────────────────┘ │                        │
│  ┌─────────────────────────┐ │                 ┌──────▼───────┐
│  │ Rust core (Tauri backend)│ │                 │  PostgreSQL   │
│  │  - LicenseService (verify│ │                 │  (source of   │
│  │    signed key offline)   │ │                 │   truth)      │
│  │  - SyncEngine (queue +   │ │                 └───────────────┘
│  │    delta push/pull)      │ │
│  │  - AuthCache (encrypted  │ │
│  │    session storage)      │ │
│  └─────────────────────────┘ │
│  ┌─────────────────────────┐ │
│  │ Local SQLite (encrypted) │ │
│  │  - mirrors core POS      │ │
│  │    tables + sync metadata│ │
│  └─────────────────────────┘ │
└───────────────────────────────┘
       ▲
       │ Admin generates license
┌──────┴───────────────┐
│  Admin Panel (existing│
│  webapp, Super Admin  │
│  role) — new License  │
│  screen               │
└───────────────────────┘
```

## 2. Desktop Client Components

- **Shell:** Tauri v2 (Rust) — same choice as the earlier desktop-packaging kit, reused here
- **UI layer:** React + Vite + TypeScript, forked/reused from `techbill-pos` component library
  (cart, inventory, reports pages) — don't rewrite what already works, adapt it to read/write
  local SQLite instead of calling the API directly
- **Rust core services** (the part that makes this "much more powerful" than a browser app):
  - `LicenseService` — verifies the signed license token entirely offline using an embedded
    Ed25519 public key; no network call needed to check validity or expiry
  - `SyncEngine` — background task, runs every N minutes when online: pushes queued local
    writes, pulls server deltas, resolves conflicts
  - `AuthCache` — stores the last-known JWT/refresh token in the OS-native secure storage
    (Windows Credential Manager / macOS Keychain via `tauri-plugin-keyring` or `stronghold`),
    so login survives offline restarts for a bounded period
  - `ClockGuard` — detects obvious clock-rollback attempts (compares local clock against the
    last-verified server timestamp saved on disk; if local time is *before* that, flags the
    license as untrusted until next online check-in)

## 3. Local Data Layer

- **Engine:** SQLite, encrypted at rest (SQLCipher) — encryption key derived from a
  device-specific secret stored in OS keychain, not hardcoded in the binary
- **Schema:** a subset of the existing Prisma schema (products, inventory units, sales,
  sale items, customers, credit records, returns) **plus sync metadata columns** on every
  table:
  - `local_id` (client-generated UUID, used before first sync)
  - `remote_id` (server ID once synced, nullable until then)
  - `updated_at`, `synced_at`
  - `dirty` (boolean — has local unsynced changes)
  - `deleted_at` (soft-delete/tombstone, so deletions sync correctly instead of just
    disappearing)

## 4. License Key Design

- **Issuance (server-side, in the new `License` module):**
  - Super Admin submits `{ tenantId, plan, expiresAt }` in Admin Panel
  - Backend generates payload `{ tenantId, plan, expiresAt, issuedAt, deviceId? }`,
    signs it with the server's **Ed25519 private key** (kept only on the backend, never
    shipped to any client), Base64-encodes the signed bundle → this is the license key string
    shown to the Super Admin to copy/send to the owner
- **Verification (client-side, fully offline):**
  - The Tauri app embeds the corresponding **public key** at build time
  - On activation, `LicenseService` decodes the key, verifies the signature against the
    embedded public key, checks `expiresAt` against local time (guarded by `ClockGuard`)
  - No network round-trip required for this check — this is what makes "expired even with
    wifi off" enforcement possible
- **Device binding (per PRD assumption A1):** first activation records a hardware
  fingerprint (disk serial + MAC hash) locally; the app refuses to honor the same key on a
  different fingerprint without a Super Admin-approved "transfer" (new endpoint, see below)

## 5. Backend Additions (NestJS + Prisma)

New Prisma models:
```
model LicenseKey {
  id          String   @id @default(uuid())
  tenantId    String
  plan        String
  issuedAt    DateTime @default(now())
  expiresAt   DateTime
  status      LicenseStatus @default(ACTIVE) // ACTIVE | EXPIRED | REVOKED
  deviceFingerprint String?
  keyToken    String   @db.Text   // the signed, issued token (kept for audit/reissue)
  issuedBy    String   // Super Admin userId
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
}

model DeviceCheckIn {
  id            String   @id @default(uuid())
  tenantId      String
  deviceFingerprint String
  lastCheckIn   DateTime
  appVersion    String
}
```

New endpoints:
- `POST /admin/licenses` — Super Admin issues a key (role-guarded, reuse existing RBAC)
- `POST /admin/licenses/:id/revoke`
- `POST /license/checkin` — device calls this when online; server can push a forced
  revoke/suspend signal here, refresh the trusted-clock timestamp, and confirm the license
  is still valid server-side (belt-and-suspenders on top of the offline check)
- `GET /sync/pull?since=<timestamp>` / `POST /sync/push` — delta sync endpoints

## 6. Sync Engine Design

- **Push:** every locally-`dirty` row is sent in a batch; server applies it, returns the
  authoritative `remote_id` + `updated_at`
- **Pull:** client sends `since` timestamp, server returns everything changed after that,
  scoped to the tenant (reuses existing tenant isolation guards)
- **Conflict resolution:**
  - Inventory stock counts: **server is always authoritative** (prevents two devices from
    both thinking the same unit is in stock — same race-condition problem the existing
    `sales.service.ts` transaction logic already guards against server-side)
  - Everything else (customer notes, settings): last-write-wins by `updated_at`
  - Any conflict is logged to a local `sync_conflicts` table the Owner can review — never
    silently dropped

## 7. Security Considerations

- Local DB encrypted (SQLCipher), key in OS keychain, not in a config file
- License public key embedded in binary; private key never leaves the backend server
- Auth refresh tokens stored via OS-native secure storage, not plain JSON on disk
- Forced check-in every 14 days (PRD A3) as the practical limit on how long a revoked/expired
  license can be bypassed by staying offline
- Code signing on the installer (reuses the earlier `desktop-release.yml` CI signing setup)

## 8. Reuse vs New

| Reused as-is | New for this project |
|---|---|
| React component library, POS UI screens | Local SQLite layer + sync engine |
| NestJS backend, existing auth, tenant guards | License module, Device module, sync endpoints |
| Tauri desktop scaffold (from earlier kit) | LicenseService, ClockGuard (Rust) |
| CI/CD workflows (from earlier kit) | Encrypted-DB migrations, offline test harness |
