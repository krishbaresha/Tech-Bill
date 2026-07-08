# Phase 2: Authorization & Frontend Security

## Purpose

The objective of this phase is to align the React frontend client with the backend multi-tenant SaaS authorization model. This ensures that the user interface correctly decodes tenant scopes, dynamically hides unauthorized views, gates page routes based on `PERMISSION_MATRIX.md` keys, and provides tenant administrators with administrative tools to manage worker roles, permissions, passwords, and account status.

---

## Preconditions

1.  **Phase 1 Completed**: Backend SaaS authorization models and database tenant isolation fields are active.
2.  **API Payloads**: Authentication responses yield token payloads containing `tenantId` and `permissions` arrays.

---

## Targeted Files

### Frontend Client
*   Auth Stores & Types (`src/stores/auth.store.ts`)
*   Route Protection Configurations (`src/App.tsx`)
*   Navigation Components (Sidebar and headers)
*   Users & Staff administration pages
*   Login and Password Reset pages

### Backend Services
*   Users controllers & services handling worker password resets and updates.

---

## Detailed Task Checklist

1.  **Frontend Type Alignment**:
    *   Extend frontend user interfaces to include `tenantId`, `tenantName`, and `permissions` claims.
    *   Include the `platform_admin` role in user roles.
2.  **Zustand Auth Store Sync**:
    *   Configure persistent storage mechanisms to retain access tokens and tenant fields.
    *   Ensure token refresh failures clear the auth store cleanly.
3.  **Permissions Helper Utilities**:
    *   Deploy core permissions utilities in `src/lib/permissions.ts`:
        *   `can(permissionKey)`: Validates individual permission keys.
        *   `canAny(permissionKeys)`: Checks if the user possesses at least one matching key.
        *   `canAll(permissionKeys)`: Ensures all keys are matched.
4.  **Route Protection Refactoring**:
    *   Gate React Router route paths using the permissions helpers, mapping keys directly to the permission matrix.
5.  **Dynamic UI Element Gating**:
    *   Hide navigation sidebar links from users lacking read permissions.
    *   Disable or hide checkout action buttons (such as cart voids or discounts) based on cashier permission profiles.
6.  **Staff Control Interface Updates**:
    *   Provide tools for administrators to register workers, configure specific permissions, toggle active status, and perform remote password resets.
7.  **Admin Password Recovery Views**:
    *   Implement views for email-based OTP requests and verification on the login screen.
    *   Configure error prompts directing regular workers to contact their store admin instead of requesting self-serve resets.
8.  **Compilation Verification**:
    *   Build and bundle the frontend to check for type issues:
      ```bash
      cd electrotrack-pos && npm run build
      ```

---

## Acceptance Criteria

*   [ ] Administrators can register workers, configure permissions, and reset user passwords.
*   [ ] Workers are blocked from requesting self-serve password resets.
*   [ ] Route components block access to unauthorized pages and redirect to dashboard.
*   [ ] UI controls (menus, buttons) dynamically update based on active permissions.
*   [ ] Frontend builds successfully.
