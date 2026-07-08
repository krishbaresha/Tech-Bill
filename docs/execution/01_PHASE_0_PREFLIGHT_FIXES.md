# Phase 0: Preflight System Checks

## Purpose

The objective of this phase is to establish a stable, compilable code baseline across the repositories before introducing multi-tenant SaaS changes. It addresses compiler blockers in reports services, resolves route discrepancies in audit logging, enforces the correct Prisma schema source of truth, and fixes visible text encoding issues.

---

## Preconditions

1.  **Working Directory**: Execute all commands from the workspace root.
2.  **Scope Boundary**: SaaS schemas, tenant rules, and the new dark glassmorphic layouts should not be integrated during this phase.

---

## Targeted Files

### Backend Services
*   `electrotrack-api/src/modules/reports/reports.service.ts`
*   `electrotrack-api/src/modules/audit/audit.controller.ts`
*   `electrotrack-api/src/modules/audit/audit.module.ts`

### Frontend UI
*   `electrotrack-pos/src/pages/audit/AuditPage.tsx`
*   Verify and resolve text encoding issues (mojibake) across client views.

### Database Configurations
*   `electrotrack-api/prisma/schema.prisma` (established as the main schema source of truth)
*   Root workspace `prisma/schema.prisma` (marked as legacy)

---

## Detailed Task Checklist

1.  **Compilation Check**: Execute backend build and note compiler errors:
    ```bash
    cd electrotrack-api && npm run build
    ```
2.  **Reports Service Adjustments**:
    *   Resolve staff performance nullability (skip sales missing a valid seller identifier `soldById`).
    *   Correct dead-stock query references (switch query filters from `createdAt` to `receivedAt`).
    *   Align return analytics schema fields (rename `isSuspicious` queries to `suspiciousFlag` to match the PostgreSQL model).
3.  **Audit Logs Route Synchronization**:
    *   Verify the API endpoints route pattern (standardized on `/audit-logs`).
    *   Synchronize frontend API calls from `/audit` to `/audit-logs`.
4.  **Prisma Schema Source Consolidation**:
    *   Establish `electrotrack-api/prisma/schema.prisma` as the singular source of truth for ORM entities.
5.  **Clean Encoding (Mojibake Resolution)**:
    *   Search files for corrupt encoding sequences:
      ```bash
      rg -n "â|ð|Ã|" electrotrack-api\src electrotrack-pos\src *.md
      ```
    *   Correct identified strings to ensure legible technical descriptions on screens.
6.  **Verify Combined Builds**:
    *   Confirm frontend and backend build pipelines compile cleanly:
      ```bash
      cd electrotrack-pos && npm run build
      cd ../electrotrack-api && npm run build
      ```

---

## Acceptance Criteria

*   [ ] Backend REST API compiles cleanly without TypeScript type errors.
*   [ ] Frontend POS client compiles and packages successfully.
*   [ ] Audit UI components fetch audit logs from `/audit-logs`.
*   [ ] Reports module logic maps accurately to active database schemas.
