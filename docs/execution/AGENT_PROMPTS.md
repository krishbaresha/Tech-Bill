# Implementation Agent Prompts

## Purpose

Ye file copy-paste prompts provide karti hai. Har prompt ek focused implementation agent ke liye hai. Agents ko phase order follow karna hoga.

## Agent 0: Preflight Fixes

```text
You are Agent 0 for ElectroTrack. Execute docs/execution/01_PHASE_0_PREFLIGHT_FIXES.md only.

Rules:
1. Do not add SaaS schema yet.
2. Fix backend compile errors first.
3. Standardize audit route mismatch.
4. Keep changes minimal and build-focused.
5. Run backend and frontend builds before reporting complete.

Deliverable:
- List files changed.
- Confirm backend build status.
- Confirm frontend build status.
```

## Agent 1: SaaS Auth Foundation

```text
You are Agent 1 for ElectroTrack. Execute docs/execution/02_PHASE_1_SAAS_AUTH_FOUNDATION.md only.

Rules:
1. Remove Google auth fully.
2. Implement shared-DB tenant isolation.
3. Add platform_admin.
4. Add tenant status/plan fields.
5. Add admin OTP password reset.
6. Workers cannot self-reset passwords.
7. Every tenant-owned service must scope by tenantId.
8. Run backend build before reporting complete.

Deliverable:
- Migration summary.
- Auth contract summary.
- Tenant isolation verification steps.
```

## Agent 2: Permissions Frontend Access

```text
You are Agent 2 for ElectroTrack. Execute docs/execution/03_PHASE_2_PERMISSIONS_FRONTEND_ACCESS.md only.

Rules:
1. Use docs/execution/PERMISSION_MATRIX.md exactly.
2. Update frontend auth types/store.
3. Route and sidebar visibility must use permissions.
4. Admin can assign worker permissions.
5. Admin can reset worker password.
6. Worker forgot password must not complete reset.
7. Run frontend build before reporting complete.

Deliverable:
- Permission helper summary.
- Routes gated.
- User management flow summary.
```

## Agent 3: Stitch UI Sync

```text
You are Agent 3 for ElectroTrack. Execute docs/execution/04_PHASE_3_STITCH_UI_SYNC.md only.

Rules:
1. Use ELECTROTRACK_CLAUDE_CODE_MASTER.md as source material, not direct execution.
2. Preserve SaaS auth, tenantId, and permissions.
3. Use real APIs first, not mock-first production pages.
4. Preserve POS serial verification.
5. Every API action must remain tenant scoped.
6. Run frontend build before reporting complete.

Deliverable:
- Screens converted.
- Any mock-only fallback screens listed.
- Permission checks preserved.
```

## Agent 4: Final QA

```text
You are Agent 4 for ElectroTrack. Execute docs/execution/05_PHASE_4_FINAL_QA_RELEASE.md only.

Rules:
1. Test two tenants minimum.
2. Test platform admin, tenant admin, and worker.
3. Test password reset rules.
4. Test permission matrix.
5. Test no tenant data leak.
6. Run backend and frontend builds.

Deliverable:
- QA checklist with pass/fail.
- Known issues.
- Release readiness summary.
```
