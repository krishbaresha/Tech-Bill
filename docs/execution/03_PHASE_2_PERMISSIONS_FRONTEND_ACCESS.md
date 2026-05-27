# Phase 2: Permissions And Frontend Access

## Purpose

Is phase ka goal frontend ko new SaaS auth model ke saath sync karna hai. Admin workers bana sake, unka password set/reset kare, aur granular permissions assign kare. Worker sirf wahi pages/actions use kare jo admin ne allow kiye hain.

## Preconditions

1. Phase 1 complete.
2. Backend auth response includes `tenantId` and `permissions`.
3. Permission keys are finalized in `PERMISSION_MATRIX.md`.
4. Backend permission guard exists.

## Files Likely Touched

Frontend:
1. Auth store and auth types.
2. Route protection in `App.tsx`.
3. Layout/sidebar.
4. Users page.
5. Login/password reset pages.

Backend:
1. Users controller/service for permission assignment and password reset.
2. Permission guard only if frontend needs API alignment.

## Line-Wise Tasks

1. Update frontend user type:
   - Add `tenantId`, `tenantName`, `permissions`.
   - Add role `platform_admin`.
2. Update auth store:
   - Persist access token and new user fields.
   - Clear auth safely on refresh failure.
3. Add permission helper:
   - `can(permissionKey)`
   - `canAny(permissionKeys)`
   - `canAll(permissionKeys)`
4. Replace route guards:
   - Keep broad role checks only where useful.
   - Gate pages by permissions from `PERMISSION_MATRIX.md`.
5. Update sidebar/menu visibility:
   - Hide pages worker cannot access.
   - Hide action buttons worker cannot use.
6. Update Users page:
   - Admin can create worker.
   - Admin can set worker role/template.
   - Admin can assign granular permissions.
   - Admin can activate/deactivate worker.
   - Admin can reset worker password.
7. Add admin password reset UI:
   - Request OTP by email.
   - Confirm OTP plus new password.
   - Route should be available from login screen.
8. Worker password reset handling:
   - Login UI may show generic help text: contact admin.
   - Do not expose worker self-reset completion flow.
9. Update API client types for auth response.
10. Run frontend build.
11. Run backend build if user APIs changed.

## Acceptance Checklist

1. Admin can create worker with password.
2. Admin can reset worker password.
3. Worker cannot self-reset password.
4. Worker sees only permitted routes.
5. Worker cannot call blocked backend actions even if URL is manually accessed.
6. Sidebar and action buttons match permissions.
7. Frontend build passes.
8. Backend build passes if touched.

## Rollback Notes

1. Revert frontend permission gating together with auth type changes.
2. Do not leave backend permission guard stricter than frontend without updating UI.
3. If Users page breaks, keep old page hidden until permissions are stable.

## Do Not Continue Until

At least one admin and one worker test account prove permissions and password control work end to end.
