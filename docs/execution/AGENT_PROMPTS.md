# Implementation Agent Prompts

## Purpose

This document contains standardized, copy-paste prompts designed to task autonomous coding agents with executing specific phases of the TechBill refactoring roadmap. Each agent must complete their designated phase checklist and verify compile success before handoff.

---

## Agent 0: Preflight System Checks

```text
You are Agent 0 tasked with preparing TechBill for architectural refactoring. Execute the tasks defined in docs/execution/01_PHASE_0_PREFLIGHT_FIXES.md.

Operational Constraints:
1. Do not introduce database schema alterations, multi-tenant fields, or security guards yet.
2. Resolve reports module compiler issues first.
3. Standardize and align audit log endpoints between frontend and backend.
4. Minimize changes; focus strictly on compiling clean code.
5. Run backend and frontend builds before reporting completion.

Deliverable Report:
- Detailed list of modified files.
- Status of backend compilation.
- Status of frontend compilation.
```

---

## Agent 1: SaaS Authentication Foundation

```text
You are Agent 1 tasked with establishing the multi-tenant architecture for TechBill. Execute the tasks defined in docs/execution/02_PHASE_1_SAAS_AUTH_FOUNDATION.md.

Operational Constraints:
1. Completely remove all Google OAuth routes, provider strategies, and packages.
2. Configure database multi-tenancy logical isolation via tenantId scoping.
3. Create the platform_admin role and tenant lifecycle management tools.
4. Implement email-based OTP password recovery restricted to owners and platform admins.
5. Ensure worker accounts cannot trigger self-serve password resets.
6. Scope database queries in all tenant-owned services by tenantId.
7. Run backend and frontend builds before reporting completion.

Deliverable Report:
- Prisma database migration summary.
- Updated authentication API contracts.
- Verification steps confirming tenant data isolation.
```

---

## Agent 2: Authorization & Frontend Security

```text
You are Agent 2 tasked with gating client-side resources for TechBill. Execute the tasks defined in docs/execution/03_PHASE_2_PERMISSIONS_FRONTEND_ACCESS.md.

Operational Constraints:
1. Align frontend code with the keys defined in docs/execution/PERMISSION_MATRIX.md.
2. Update state storage mechanisms to parse tenant claims from user JWTs.
3. Secure React Router paths and navigation layout elements based on active permissions.
4. Provide administrative forms for owners to manage worker permissions and trigger remote password updates.
5. Block worker self-serve password recovery from completing.
6. Verify clean client compilation before reporting completion.

Deliverable Report:
- Summary of frontend permissions helper utilities.
- List of secured frontend routes.
- User management controls verification details.
```

---

## Agent 3: Stitch UI Integration

```text
You are Agent 3 tasked with applying the dark glassmorphic design system to TechBill. Execute the tasks defined in docs/execution/04_PHASE_3_STITCH_UI_SYNC.md.

Operational Constraints:
1. Treat docs/execution/TECHBILL_CLAUDE_CODE_MASTER.md as reference source material, not direct steps.
2. Retain multi-tenant boundaries, tenantId scoping, and permission guards.
3. Bind views to live backend API services (do not fall back to static mock data).
4. Maintain POS serial number verification and checkout flow logic.
5. Scope all UI mutations and queries by tenantId.
6. Confirm compile success for the frontend client before reporting completion.

Deliverable Report:
- List of redesigned client views.
- Identification of any remaining static fallback views.
- Verification that permission gating is intact.
```

---

## Agent 4: Quality Assurance Validation

```text
You are Agent 4 tasked with executing QA validation for TechBill. Execute the tasks defined in docs/execution/05_PHASE_4_FINAL_QA_RELEASE.md.

Operational Constraints:
1. Conduct tests across a minimum of two tenants (one active, one suspended).
2. Validate access flows using platform admin, tenant owner, and cashier profiles.
3. Check password recovery boundaries (allowed for owners, blocked for cashiers).
4. Run access attempts against the permissions matrix.
5. Confirm zero cross-tenant data leaks.
6. Execute final compilation checks.

Deliverable Report:
- QA checklist detailing pass/fail status per item.
- Log of remaining known limitations or issues.
- Handoff and release readiness summary.
```
