# TechBill API Contract Specification

## Purpose

This document specifies the backend API endpoint contracts, request/response models, and JWT structures. It ensures consistency between the React frontend client and the NestJS backend services.

---

## Authentication API Contracts

### 1. User Authentication Response
`POST /auth/login`
Returns user credentials and tenant configuration mappings.

*   **Response Body**:
    ```json
    {
      "access_token": "eyJhbGciOi...",
      "user": {
        "id": "84323214-dfba-4933-bf9c-1481b7e4e1a0",
        "name": "Gulberg Admin",
        "email": "owner@electroshop.pk",
        "role": "owner",
        "tenantId": "00000000-0000-0000-0000-000000000002",
        "tenantName": "TechBill Gulberg",
        "permissions": ["pos.read", "pos.sell", "reports.read"]
      }
    }
    ```
    *Note: Platform administrators yield `"tenantId": null` and `"tenantName": null`.*

### 2. JWT Payload Claims
Decoded payload embedded inside JWT tokens:
```json
{
  "sub": "84323214-dfba-4933-bf9c-1481b7e4e1a0",
  "email": "owner@electroshop.pk",
  "role": "owner",
  "tenantId": "00000000-0000-0000-0000-000000000002",
  "permissions": ["pos.read", "pos.sell", "reports.read"]
}
```

---

## Authentication Endpoints Registry

1.  `POST /auth/login` - Authenticate and set HttpOnly refresh tokens.
2.  `POST /auth/refresh` - Rotate access and refresh tokens.
3.  `POST /auth/logout` - Revoke active refresh tokens.
4.  `POST /auth/request-otp` - Trigger temporary reset OTP.
5.  `POST /auth/verify-otp` - Validate OTP status.
6.  `POST /auth/password-reset/request` - Initiate email-based admin/owner reset.
7.  `POST /auth/password-reset/confirm` - Complete admin/owner password update.

*Constraint: Legacy Google authentication pathways are removed.*

---

## Password Recovery Schemas

### Request Password Reset
`POST /auth/password-reset/request`
*   **Request Body**:
    ```json
    {
      "email": "owner@electroshop.pk"
    }
    ```
*   **Response Body**:
    ```json
    {
      "message": "If this account is authorized to perform resets, an OTP email has been dispatched."
    }
    ```
    *Security Constraint: Standard worker accounts trigger the same success message, but no OTP is dispatched to prevent bypass attempts.*

### Confirm Password Reset
`POST /auth/password-reset/confirm`
*   **Request Body**:
    ```json
    {
      "email": "owner@electroshop.pk",
      "otp": "124869",
      "newPassword": "SecurePassword123"
    }
    ```
*   **Response Body**:
    ```json
    {
      "message": "Password successfully updated."
    }
    ```

---

## Users & Worker Administration Endpoints

1.  `GET /users` - Retrieve lists of worker accounts registered under the current tenant.
2.  `POST /users` - Register a new worker profile within the tenant context.
3.  `PATCH /users/:id` - Modify worker settings (name, role template, status, overrides).
4.  `PATCH /users/:id/password` - Tenant owner resets a worker's password.
5.  `DELETE /users/:id` - Deactivate a worker account.

---

## Platform Tenant Endpoints (Super Admin Only)

1.  `GET /platform/tenants` - List subscriber tenants.
2.  `POST /platform/tenants` - Initialize new tenant structures.
3.  `GET /platform/tenants/:id` - Fetch tenant metadata.
4.  `PATCH /platform/tenants/:id` - Update billing details or parameters.
5.  `PATCH /platform/tenants/:id/status` - Suspend or restore tenant subscriptions.
6.  `POST /platform/tenants/:id/admin` - Provision the root administrator account for a tenant.

---

## Tenant Scoping Rules

1.  **Implicit Context Binding**: Tenant users do not transmit `tenantId` in request payloads for business transactions. The API automatically extracts the `tenantId` from the verified JWT context.
2.  **Platform Overrides**: Platform administration routes must explicitly pass target tenant identifiers (e.g. `/platform/tenants/:id`) to modify subscription parameters.
