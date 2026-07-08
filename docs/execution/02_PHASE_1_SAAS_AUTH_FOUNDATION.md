# Phase 1: SaaS Authentication Foundation

## Purpose

The objective of this phase is to establish the core multi-tenant SaaS architecture for TechBill. This involves removing the legacy Google OAuth integration, implementing logical database isolation via tenant scopes, setting up platform administrator controls to manage subscriber tenants, and deploying email-based OTP password recovery restricted to administrators and owners. Regular store workers are prevented from initiating self-serve password resets and must request updates from their tenant administrator.

---

## Preconditions

1.  **Phase 0 Completed**: Stable baseline and reports service compilation fixes are active.
2.  **Backup**: Ensure the PostgreSQL database is backed up prior to running migrations.

---

## Targeted Files

### Backend Services
*   Auth Module (strategies, controllers, services, guards)
*   Users Module (worker management, password fields)
*   Common Interceptors (guards and decorators)
*   All business service modules (Sales, Inventory, Returns, Reports)

### Database Schemas
*   `electrotrack-api/prisma/schema.prisma`
*   Prisma migrations & seed settings

---

## Detailed Task Checklist

1.  **Purge Google OAuth Integration**:
    *   Delete Google OAuth redirect routes from the authentication controller.
    *   Remove `GoogleStrategy` configurations from the auth providers.
    *   Remove OAuth DTO files, environment variable definitions (`GOOGLE_CLIENT_ID`, etc.), and package dependencies.
2.  **Implement Multi-Tenant Schema**:
    *   Define the `Tenant` model in `schema.prisma` containing fields: `status`, `plan`, `trialEndsAt`, `currentPeriodEnd`, and `maxUsers`.
    *   Add `tenantId` columns and database index associations to all tenant-owned models.
    *   Support global `platform_admin` accounts with null tenant mappings.
3.  **Role & Permissions Integration**:
    *   Add `platform_admin` to the standard `Role` enum list.
    *   Ensure permissions are stored on the `User` model, aligning with keys defined in `PERMISSION_MATRIX.md`.
4.  **JWT Token Payload Expansion**:
    *   Include claims: `sub`, `email`, `role`, `tenantId`, `permissions` in signed JWTs.
    *   Ensure tokens are rejected if the user is flagged as inactive or if their tenant status is set to `suspended` or `cancelled`.
5.  **Multi-Tenant Query Scoping**:
    *   Establish `TenantGuard` to enforce user tenant context mapping.
    *   Configure all backend database queries (CRUD operations in Sales, Inventory, Returns, Reports) to include `where: { tenantId }` parameters.
6.  **Admin Password Recovery & Worker Management**:
    *   Configure password reset request (`POST /auth/password-reset/request`) and confirm (`POST /auth/password-reset/confirm`) endpoints using SMTP-delivered OTP keys.
    *   Block self-serve resets for regular workers. Enable tenant owners and admins to reset worker passwords via `PATCH /users/:id/password`.
7.  **Seed Data Refactoring**:
    *   Refactor `prisma/seed.ts` to insert platform administrators, sample tenants, and default worker accounts with mapped permissions.
8.  **Migrate & Compile**:
    *   Run migrations, regenerate the Prisma Client, and confirm the backend builds:
      ```bash
      npx prisma migrate dev
      npm run build
      ```

---

## Acceptance Criteria

*   [ ] Google OAuth routes and references are completely removed.
*   [ ] Platform admins can register, audit, and suspend tenant objects.
*   [ ] Authentication tokens yield correct tenant context scopes.
*   [ ] Tenant data queries are isolated; Tenant A cannot access Tenant B data.
*   [ ] Suspended or inactive users are blocked from logging in.
*   [ ] Regular workers cannot request self-serve password resets.
