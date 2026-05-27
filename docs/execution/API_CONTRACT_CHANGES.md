# API Contract Changes

## Purpose

Ye file SaaS/auth conversion ke public contracts define karti hai so backend and frontend same wire shape use karein.

## Auth Login Response

`POST /auth/login` returns:

```json
{
  "access_token": "jwt",
  "user": {
    "id": "uuid",
    "name": "Shop Admin",
    "email": "admin@example.com",
    "role": "owner",
    "tenantId": "uuid",
    "tenantName": "ElectroTrack Gulberg",
    "permissions": ["pos.read", "pos.sell"]
  }
}
```

Platform admin user returns `tenantId: null` and `tenantName: null`.

## JWT Payload

```json
{
  "sub": "user-uuid",
  "email": "admin@example.com",
  "role": "owner",
  "tenantId": "tenant-uuid",
  "permissions": ["pos.read", "pos.sell"]
}
```

## Auth Endpoints

1. `POST /auth/login`
2. `POST /auth/refresh`
3. `POST /auth/logout`
4. `POST /auth/request-otp`
5. `POST /auth/verify-otp`
6. `POST /auth/password-reset/request`
7. `POST /auth/password-reset/confirm`

Google endpoints must not exist.

## Password Reset Contracts

### Request

`POST /auth/password-reset/request`

```json
{
  "email": "admin@example.com"
}
```

Response is always generic:

```json
{
  "message": "If this account can reset password, an OTP has been sent."
}
```

Workers receive the same generic response but no reset OTP is sent.

### Confirm

`POST /auth/password-reset/confirm`

```json
{
  "email": "admin@example.com",
  "otp": "123456",
  "newPassword": "newStrongPassword"
}
```

## User Management Endpoints

1. `GET /users` - tenant admin lists users in same tenant.
2. `POST /users` - tenant admin creates worker/admin in same tenant according to allowed rules.
3. `PATCH /users/:id` - tenant admin updates name, role/template, active status, permissions.
4. `PATCH /users/:id/password` - tenant admin resets worker password.
5. `DELETE /users/:id` - tenant admin deactivates user.

## Platform Endpoints

1. `GET /platform/tenants`
2. `POST /platform/tenants`
3. `GET /platform/tenants/:id`
4. `PATCH /platform/tenants/:id`
5. `PATCH /platform/tenants/:id/status`
6. `POST /platform/tenants/:id/admin`

Only `platform_admin` can call these.

## Tenant Scoping Rule

1. Tenant users never send `tenantId` for normal business operations.
2. Backend reads `tenantId` from JWT/request user.
3. Backend writes `tenantId` from JWT/request user.
4. Platform admin endpoints must explicitly name tenant when acting on tenant data.

## Do Not Continue Until

Frontend types, backend DTOs, guards, and services all match this contract.
