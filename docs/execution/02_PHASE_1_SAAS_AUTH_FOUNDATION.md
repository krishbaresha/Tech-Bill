# Phase 1: SaaS Auth Foundation

## Purpose

Is phase mein ElectroTrack ko real SaaS foundation milegi: Google auth remove hoga, har shop/admin ka separate tenant hoga, platform super admin tenants manage karega, admin apne workers manage karega, aur admin OTP based password reset use karega. Worker apna password khud reset nahi karega.

## Preconditions

1. Phase 0 complete.
2. Backend build passes before starting.
3. `electrotrack-api/prisma/schema.prisma` is the working schema source.
4. Database backup available before migration.

## Files Likely Touched

Backend:
1. Auth module, service, controller, strategy files.
2. Users module.
3. Common guards/decorators.
4. All tenant-owned service modules.

Database:
1. `electrotrack-api/prisma/schema.prisma`
2. Prisma migrations.
3. Seed file.

Frontend:
1. Auth types only if needed for compile compatibility.

## Line-Wise Tasks

1. Remove Google auth:
   - Delete Google routes from auth controller.
   - Remove `GoogleStrategy` from auth module providers.
   - Remove `oauthLogin` and OAuth DTO/interface from auth service.
   - Remove Google-only login error text.
   - Remove Google env vars from `.env.example`.
   - Remove `passport-google-oauth20` and related types from package if unused.
2. Add SaaS schema:
   - Add `Tenant` model.
   - Add tenant lifecycle fields: `status`, `plan`, `trialEndsAt`, `currentPeriodEnd`, `maxUsers`.
   - Add `tenantId` to tenant-owned models.
   - Keep platform admin users with `tenantId = null`.
3. Add role model:
   - Add `platform_admin` to `Role`.
   - Keep tenant roles: `owner`, `cashier`, `inventory_manager`, `accountant`, `technician`.
4. Add permissions:
   - Add worker permission storage to user model or related `UserPermission` model.
   - Use `PERMISSION_MATRIX.md` as source of permission keys.
5. Update JWT:
   - Include `sub`, `email`, `role`, `tenantId`, `permissions`.
   - Reject inactive users.
   - Reject suspended/cancelled tenants for tenant users.
6. Add tenant guard:
   - Request user must carry tenant context for tenant-owned APIs.
   - Platform admin routes must be explicit and separate.
7. Scope all tenant-owned services:
   - Every list/get/update/delete for business data must filter by `tenantId`.
   - Every create for business data must write `tenantId` from request user.
8. Add platform admin endpoints:
   - Create tenant.
   - List tenants.
   - Update tenant status/plan.
   - Create initial tenant admin.
9. Add admin password reset:
   - `POST /auth/password-reset/request`
   - `POST /auth/password-reset/confirm`
   - OTP is email based.
   - Only platform admin and tenant owner/admin can self-reset.
10. Add admin-managed worker password reset:
   - `PATCH /users/:id/password`
   - Tenant admin can reset worker password in same tenant.
   - Worker cannot reset own password by email.
11. Update seed:
   - Create platform admin.
   - Create sample tenant.
   - Create sample tenant owner/admin.
   - Create sample worker users inside sample tenant.
12. Run migration.
13. Regenerate Prisma client.
14. Run backend build.

## Acceptance Checklist

1. Google auth code/env/dependency references are gone.
2. Platform admin can create and suspend tenant.
3. Tenant admin can login and JWT includes `tenantId`.
4. Worker can login and JWT includes assigned permissions.
5. Worker forgot-password request does not reset worker password.
6. Tenant admin can reset worker password.
7. Suspended tenant users cannot login.
8. Tenant A cannot read Tenant B data.
9. Backend build passes.

## Rollback Notes

1. Roll back Prisma migration if tenant schema breaks core queries.
2. Revert auth changes together; do not leave Google partially removed.
3. Restore backup if tenant backfill corrupts existing data.

## Do Not Continue Until

Tenant isolation is verified with at least two tenants and backend build passes.
