# TechBill Mobile App Architecture

## Overview
The TechBill Mobile application is designed specifically for store owners to monitor real-time business activities, track metrics on the go, and review administrative tasks.

### Core Objectives
1.  **Sales Dashboard**: Visualize live sales, trends, and payment method breakdowns.
2.  **Push Notifications**: Receive alerts for critical events (such as return requests, low stock, or high-discount OTP overrides).
3.  **Real-Time Approvals**: Empower owners to review, approve, or reject pending product return requests directly from mobile devices.

---

## Data Flow & Integration Patterns

### 1. Authentication & Tenant Resolution
*   The mobile app authenticates against the TechBill API `/auth/login` endpoint.
*   Upon authentication, the app receives a standard JWT (JSON Web Token) which must be attached to all subsequent request headers as a Bearer token.
*   **Role Enforcement**: The mobile client decodes the JWT and validates the user role (requiring `owner` or `platform_admin`) before loading administrative views.
*   **Multi-Tenancy**: The JWT contains the `tenantId` field, which the backend uses to scope all queries, maintaining complete data isolation.

### 2. Live Sales Dashboard
*   The mobile dashboard polls or establishes WebSockets to retrieve daily aggregated sales.
*   **Data Serialization**: It accesses NestJS `/reports` endpoints to populate charts and list the latest store transactions.

### 3. Return Request Approvals
When a cashier initiates a return from the web POS screen:
1.  **Return Request Initiation**: The POS client issues a `POST /returns` query, creating a `pending` return record in the Postgres database and marking the unit status as `return_pending`.
2.  **Notification Broadcast**: The backend emits an event (via a NestJS event emitter) that maps to the FCM (Firebase Cloud Messaging) integration.
3.  **Push Alert**: The owner receives an FCM notification: *"Suspicious Return Alert: Invoice #INV-1002"*.
4.  **Mobile Review**: The owner taps the alert, prompting the mobile app to fetch detailed metadata from `/returns/:id`.
5.  **Resolution Decision**: The owner grants approval (`PATCH /returns/:id/approve`) or rejects the request (`PATCH /returns/:id/reject`).
    *   *Note: OTP overrides are not required for mobile-approved requests, as the session is authenticated.*

### 4. Push Notification Engine (Proposed Integration)
To enable FCM notifications, the backend integrates device registries:
*   **FCM Registry Endpoint**: `POST /users/devices` registers the mobile device token against the authenticated user account.
*   **Firebase Admin SDK**: A NestJS notification module is configured with Firebase service credentials.
*   **Event Listeners**: On-event hooks intercept return submissions and dispatch payloads to registered tokens associated with the tenant owner.

---

## Mobile Client API Mapping

All requests are dispatched to the backend API (`https://api.techbill.app`):

| Endpoint Pattern | HTTP Method | Objective |
|------------------|-------------|-----------|
| `/auth/login`    | `POST`      | Authorize user and retrieve JWT credentials. |
| `/reports/sales-summary` | `GET` | Retrieve daily revenue, transaction counts, and charts. |
| `/returns?status=pending` | `GET` | List return requests requiring approval. |
| `/returns/:id`   | `GET`       | View single return items and suspicious-flag fraud indicators. |
| `/returns/:id/approve` | `PATCH` | Approve return and release refund. |
| `/returns/:id/reject`  | `PATCH` | Reject return and reset item status. |
| `/users/devices` | `POST`      | Register device token for push alerts. |
