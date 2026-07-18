# CLAUDE.md — TechBill Desktop Pro Build Instructions

You (Claude Code) are building **TechBill Desktop Pro** — an offline-first, license-gated
desktop POS app. Read `PRD.md`, `ARCHITECTURE.md`, and `TECH_STACK.md` in this same folder
fully before writing any code. They are the source of truth for *what* to build; this file
is the source of truth for *how* to work.

---

## 0. Absolute rules — never break these

1. **Work only inside this folder** (`techbill-desktop-pro/`, a new sibling folder to the
   existing `Tech-Bill` repo). You may **read** the existing `techbill-api` and
   `techbill-pos` code for reference/reuse (per ARCHITECTURE.md §8), but never edit files
   inside the original `Tech-Bill` repo from this project. If backend changes are genuinely
   needed (the new License/Device modules), build them as a clearly-separated addition and
   flag it to the human before merging into the real backend repo — don't silently modify
   production backend code.
2. **Never leave the tree in a broken state.** After every meaningful change: run
   typecheck, lint, unit tests, and build. All four must pass before you move on or commit.
   If something fails and you can't fix it within a reasonable number of attempts, stop and
   explain the blocker instead of papering over it or committing broken code.
3. **No guessing on security/financial/license logic.** License verification, expiry
   enforcement, payment/credit calculations, and tenant data isolation are the highest-risk
   parts of this project. If the spec (PRD.md) is ambiguous on one of these, stop and ask
   the human — don't assume.
4. **Realistic claims only.** Don't tell the human "this is now bug-free" or "impossible to
   crash." Report what you tested, what passed, and what you did NOT get to test.
5. **UI/UX rule (mandatory, no exceptions):** Before designing or building ANY screen,
   component, layout, color choice, or design-system decision, you must consult the
   **UI/UX Pro Max** skill. Setup (once, at the start of Phase 2):
   ```bash
   npm install -g ui-ux-pro-max-cli
   cd techbill-desktop-pro   # this project's root
   uipro init --ai claude
   ```
   Then, before designing each screen, search it for guidance, e.g.:
   ```bash
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "POS checkout screen" --domain style
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "dashboard" --stack react
   ```
   Do not design a screen "from memory" or from generic defaults — always search this skill
   first and follow its guidance for style/typography/layout choices. If a query returns
   nothing useful, say so explicitly rather than silently skipping the step.

---

## 1. Folder structure to create

```
techbill-desktop-pro/
├── PRD.md, ARCHITECTURE.md, TECH_STACK.md, CLAUDE.md   (already exist — this file)
├── app/                    # Tauri + React desktop client
│   ├── src/                # React UI
│   ├── src-tauri/          # Rust core (LicenseService, SyncEngine, ClockGuard)
│   └── tests/e2e/          # Playwright tests
├── backend-additions/      # License + Device NestJS modules, built standalone here first
│   └── prisma-additions/   # New model definitions, reviewed before merging upstream
└── docs/
    └── DECISIONS.md        # Running log: every assumption you resolved and how
```

## 2. Phases — do them in order, don't skip ahead

### Phase 1 — Project scaffold
- Create the folder structure above
- Scaffold the Tauri + React app (reuse the Tauri config pattern from the earlier
  desktop-packaging kit if the human has it available; otherwise `npm create tauri-app@latest`)
- Scaffold `backend-additions/` as a standalone NestJS module folder (not yet wired into
  the real backend)
- **Gate:** `npm install`, empty app builds and launches. Commit.

### Phase 2 — UI/UX setup + design system
- Run the UI/UX Pro Max setup from §0.5
- Generate/confirm the design system for this app (colors, typography, component style) —
  save the output to `docs/DESIGN_SYSTEM.md` so every later screen stays consistent
- **Gate:** design system documented, no code yet to test. Commit.

### Phase 3 — Local data layer
- Implement the SQLite schema (subset of Prisma schema + sync metadata columns, per
  ARCHITECTURE.md §3)
- Wire up SQLCipher encryption with a device-derived key in OS keychain
- Write `cargo test` / unit tests for basic CRUD on at least: products, sales, customers
- **Gate:** all local-DB tests pass, encryption verified (confirm the raw .db file is NOT
  human-readable when opened directly). Commit.

### Phase 4 — License system (highest priority, most scrutiny)
- Backend: `LicenseKey` + `DeviceCheckIn` Prisma models, issuance/revoke endpoints
  (`backend-additions/`)
- Client: `LicenseService` (Ed25519 offline verification) + `ClockGuard`
  (rollback detection) in Rust
- Write the license activation UI screen (using the design system from Phase 2)
- Write `cargo test` cases for: valid key accepted, expired key blocked, tampered/invalid
  signature rejected, clock-rollback detected
- **Gate:** every license test above passes, including deliberately-adversarial ones
  (tampered token, rolled-back clock). Do not proceed to Phase 5 until this is solid —
  it's the core value proposition of the whole product. Commit.

### Phase 5 — Auth (shared with webapp)
- Login screen calling the existing backend auth endpoints
- Encrypted offline session cache (bounded validity period — confirm the period with the
  human if PRD.md doesn't specify one explicitly)
- **Gate:** login works online, cached session survives an offline restart, tests pass.
  Commit.

### Phase 6 — Core POS features (port from techbill-pos, reading it for reference only)
- Build screens in this priority order: POS/cart+checkout → inventory → sales history →
  customers → reports → returns/credit
- Every screen: consult UI/UX Pro Max skill first (§0.5), then implement against the local
  SQLite layer (not a direct API call)
- After each screen: write a Playwright e2e test for its core flow before moving to the next
  screen — same pattern as the existing `techbill-pos` tester (search/add-to-cart test, route
  smoke tests)
- **Gate per screen:** typecheck + relevant unit tests + that screen's e2e test all pass.
  Don't batch up five screens and test at the end — test after each one.

### Phase 7 — Sync engine
- Implement push/pull delta sync (ARCHITECTURE.md §6)
- Test scenario: make changes offline, go "online" (point at a local test backend), confirm
  sync applies correctly and conflicts land in `sync_conflicts` rather than silently
  overwriting
- **Gate:** sync integration tests pass, including a deliberate conflict scenario.

### Phase 8 — Packaging, signing, CI
- Reuse the `desktop-release.yml` pattern from the earlier kit
- Confirm the built installer actually installs and launches on a clean test environment
- **Gate:** CI green, installer tested.

### Phase 9 — Full regression pass
- Run the entire test suite (unit + Rust + Playwright) end to end
- Manually walk through every flow in PRD.md §5 once
- Update `docs/DECISIONS.md` with anything resolved along the way
- Write a short `docs/KNOWN_LIMITATIONS.md` — be honest about anything not fully covered

---

## 3. Working style

- Small commits, one logical change each, descriptive messages
- After anything you're unsure about, write it to `docs/DECISIONS.md` rather than just
  silently picking an interpretation and moving on
- If you hit a genuine architecture question not answered by PRD/ARCHITECTURE/TECH_STACK,
  stop and ask — don't improvise on the license/security-critical paths (§0.3)
- When a phase gate fails and you can't fix it after real effort, report the exact error and
  what you tried — don't hide it or quietly weaken the test to make it pass
