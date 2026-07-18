# TechBill Desktop Pro — Tech Stack

## Desktop Shell
- **Tauri v2** (Rust) — small installers, native performance, direct hardware access
  (printers/scanners), and lets the offline license check run in compiled native code
  (harder to tamper with than JS running in a webview)

## Frontend
- **React 18 + TypeScript + Vite** — reuse `techbill-pos` component patterns
- **Zustand** — state management (same as existing webapp, keeps mental model consistent)
- **TanStack Query** — for the parts of the UI that do talk to the local Rust layer/sync
  status, keeps loading/error states consistent

## UI/UX — MANDATORY RULE
- **`ui-ux-pro-max-cli`** (npm package, verified legitimate — design-intelligence skill for
  AI coding assistants) must be installed and used for **every** UI/UX decision, screen
  layout, and design-system choice in this project. No screen gets designed "from memory" —
  always consult the skill first. Full rule and exact commands are in
  `CLAUDE_INSTRUCTIONS.md`.

## Local Data Layer
- **SQLite** via `tauri-plugin-sql`, encrypted at rest with **SQLCipher**
- **Kysely** (typed SQL query builder) on the TypeScript side for local queries — avoids a
  second ORM to learn (Prisma stays server-side only) while keeping queries type-safe
- Sync metadata columns on every table (see ARCHITECTURE.md §3)

## License Cryptography
- **Ed25519** signing:
  - Server (Node/NestJS): `@noble/ed25519` or `tweetnacl` to sign license payloads
  - Client (Rust): `ed25519-dalek` to verify offline
- Chosen over RSA for smaller key/signature size (easier to embed a short license-key string
  the Super Admin can copy-paste) and because verification is fast enough to do on every app
  launch without any noticeable delay

## Auth & Secure Storage
- Existing JWT-based auth (reuse backend as-is)
- `tauri-plugin-stronghold` (or OS-native keychain via a keyring plugin) for storing refresh
  tokens and the local DB encryption key — never plain JSON on disk

## Backend Additions
- **NestJS** (existing) + **Prisma** (existing) — add `License` and `Device` modules
  following the existing module structure (controller/service/dto pattern already used
  throughout `techbill-api`)
- New endpoints reuse the existing `ThrottlerGuard`, `TenantGuard`, and role-based guards
  already in the codebase — don't reinvent auth/rate-limiting

## Sync Transport
- Plain REST (`/sync/pull`, `/sync/push`) — no need for websockets here since sync is
  periodic/background, not real-time; keeps the offline story simple (no persistent
  connection to maintain)

## Testing
- **Vitest** — unit tests for TS business logic (mirrors what's already set up for
  `techbill-pos`)
- **`cargo test`** — Rust unit tests for `LicenseService` and `ClockGuard` (this logic is
  security-critical and must be tested at the Rust level, not just through the UI)
- **Playwright** — e2e tests against the Tauri app's webview (same pattern as the
  `techbill-pos` tester built earlier), covering: activation flow, offline sale flow,
  expiry-blocks-sale flow, sync-after-reconnect flow
- Every phase in `CLAUDE_INSTRUCTIONS.md` ends with a mandatory full test run before moving
  to the next phase

## CI/CD
- GitHub Actions — reuse the `desktop-release.yml` pattern from the earlier desktop-packaging
  kit (code-signed builds on tag push, auto-update manifest)

## Monitoring
- **Sentry** (desktop-native SDK for Tauri/Rust panics + JS errors) — same reasoning as the
  earlier plan: an offline POS crashing with no visibility is worse than a webapp crashing,
  because the shopkeeper has no browser console to report from
