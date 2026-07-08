# TechBill Multi-Tenant SaaS Execution Roadmap

## Purpose

This master index outlines the chronological order of the architectural refactoring execution steps. The primary objective is to convert the legacy single-shop checkout database application into a high-scale, multi-tenant SaaS Enterprise Resource Planning (ERP) platform (**TechBill**) with secure data isolation, role-based access control, unified Stitch glassmorphic user interface designs, and robust performance profiles.

---

## Preconditions & Constraints

1.  **Working Directory**: Execute all commands from the workspace root directory.
2.  **Legacy Reference**: `PLAN.md` is retained for historical single-shop context only. Do not execute steps from that plan.
3.  **Mandatory Build Checkpoints**: After completing any phase, verify that both the backend (`electrotrack-api`) and frontend (`electrotrack-pos`) applications compile cleanly without warnings or errors.

---

## Execution Phases Checklist

To execute or review the changes systematically, follow these phase guidelines:

1.  **Phase 0 — Preflight System Checks**
    *   *Reference File*: [01_PHASE_0_PREFLIGHT_FIXES.md](file:///d:/Tech-Bill/docs/execution/01_PHASE_0_PREFLIGHT_FIXES.md)
    *   *Objective*: Address syntax warnings, unused imports, type safety errors, and clean up workspace files.

2.  **Phase 1 — SaaS Auth Foundation**
    *   *Reference File*: [02_PHASE_1_SAAS_AUTH_FOUNDATION.md](file:///d:/Tech-Bill/docs/execution/02_PHASE_1_SAAS_AUTH_FOUNDATION.md)
    *   *Objective*: Introduce the `Tenant` schema, associate `tenantId` across resources, purge Google Auth, implement `TenantGuard`, and deploy OTP password recovery endpoints.

3.  **Phase 2 — Authorization & Access Control**
    *   *Reference File*: [03_PHASE_2_PERMISSIONS_FRONTEND_ACCESS.md](file:///d:/Tech-Bill/docs/execution/03_PHASE_2_PERMISSIONS_FRONTEND_ACCESS.md)
    *   *Objective*: Gate frontend routes, manage tenant worker users, restrict password reset paths, and configure client-side permissions checking.

4.  **Phase 3 — UI Synchronization**
    *   *Reference File*: [04_PHASE_3_STITCH_UI_SYNC.md](file:///d:/Tech-Bill/docs/execution/04_PHASE_3_STITCH_UI_SYNC.md)
    *   *Objective*: Embed the glassmorphism layout controls, design dashboards with active tenant headers, and connect dynamic datasets.

5.  **Phase 4 — QA and Polish**
    *   *Reference File*: [05_PHASE_4_FINAL_QA_RELEASE.md](file:///d:/Tech-Bill/docs/execution/05_PHASE_4_FINAL_QA_RELEASE.md)
    *   *Objective*: Test CORS origins, handle uncaught checkout mutations, remove dead icon dependencies, and test health endpoints.

---

## Core Command Reference

### 1. Verify Backend Build
```bash
cd electrotrack-api
npm run build
```

### 2. Verify Frontend Build
```bash
cd electrotrack-pos
npm run build
```

### 3. Verify Code Integrity
```bash
# Check for legacy names or placeholders
git diff --name-only
```
