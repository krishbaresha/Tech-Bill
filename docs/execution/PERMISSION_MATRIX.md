# TechBill Permissions Matrix Specification

## Purpose

This document defines the system-wide permissions schema. The backend guards, frontend route checkers, menu configurations, and action controls adhere to this matrix.

---

## Permission Keys Reference

| Permission Key | Description |
|----------------|-------------|
| `pos.read`     | Access the Checkout POS interface. |
| `pos.sell`     | Finalize checkout sales transactions. |
| `pos.discount` | Authorize cart discounts (within pre-OTP threshold limits). |
| `pos.void`     | Void completed transactions. |
| `inventory.read` | View the product catalog and serial directories. |
| `inventory.write` | Register or edit product catalogs and serial configurations. |
| `inventory.delete` | Deactivate or remove products from listing. |
| `suppliers.read` | View supplier directories and purchase order lists. |
| `suppliers.write` | Create suppliers, purchase orders, and Goods Received Notes. |
| `customers.read` | View customer listings and purchase histories. |
| `customers.write` | Create or update customer profiles. |
| `returns.read` | View return logs and pending requests. |
| `returns.create` | Initiate product return requests (flags unit as pending). |
| `returns.review` | Approve or reject pending returns (authorized for owners/admins). |
| `reports.read` | View analytics dashboards, charts, and summaries. |
| `reports.cash_reconciliation` | Submit or review daily cash drawers. |
| `users.read`   | View lists of workers and accounts. |
| `users.manage` | Add, update, activate/deactivate worker accounts. |
| `users.permissions` | Edit or override worker permission sets. |
| `settings.read` | View tenant configurations and invoice branding parameters. |
| `settings.manage` | Modify settings, thresholds, and invoice templates. |
| `audit.read`   | View system audit log records. |
| `notifications.read` | View alert feeds. |
| `notifications.manage` | Clear or resolve alerts. |
| `warranty.read` | Access the serial-number warranty lookup interface. |
| `loyalty.read` | View customer loyalty details. |
| `loyalty.manage` | Modify loyalty reward rules and points calculations. |

---

## Role-Permission Templates

### 1. Tenant Owner / Admin
*   Possesses all tenant-level permissions.

### 2. Cashier
*   `pos.read`, `pos.sell`, `customers.read`, `customers.write`, `returns.read`, `returns.create`, `notifications.read`, `warranty.read`.

### 3. Inventory Manager
*   `pos.read`, `inventory.read`, `inventory.write`, `suppliers.read`, `suppliers.write`, `notifications.read`, `warranty.read`.

### 4. Accountant
*   `reports.read`, `reports.cash_reconciliation`, `customers.read`, `notifications.read`, `audit.read`.

### 5. Technician
*   `inventory.read`, `warranty.read`, `returns.read`, `notifications.read`.

---

## Page Route Mapping Gating Rules

| Route Path | Required Permission Key |
|------------|-------------------------|
| `/pos`      | `pos.read` |
| `/dashboard` | `reports.read` |
| `/inventory` | `inventory.read` |
| `/returns`  | `returns.read` |
| `/reports`  | `reports.read` |
| `/customers` | `customers.read` |
| `/suppliers` | `suppliers.read` |
| `/purchase-orders` | `suppliers.read` |
| `/grn`      | `suppliers.write` |
| `/users`    | `users.read` |
| `/settings` | `settings.read` |
| `/audit`    | `audit.read` |
| `/warranty` | `warranty.read` |
| `/loyalty`  | `loyalty.read` |

---

## Action Mapping Gating Rules

*   **Finalize Transactions**: Requires `pos.sell`.
*   **Apply Discounts**: Requires `pos.discount`.
*   **Void Sales**: Requires `pos.void`.
*   **Add/Edit Product specs**: Requires `inventory.write`.
*   **Remove Product specs**: Requires `inventory.delete`.
*   **Process Returns**: Requires `returns.review`.
*   **Manage Worker Accounts**: Requires `users.manage`.
*   **Configure Shop Settings**: Requires `settings.manage`.
