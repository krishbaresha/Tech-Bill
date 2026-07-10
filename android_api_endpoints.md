# Electrotrack SaaS API Documentation

**Base URL:** `https://electrotrack-saas.onrender.com`

*Note for Android Developers: Replace path variables starting with a colon (e.g., `:id`, `:entityType`, `:invoiceNumber`) with actual values in your app.*

## 🤖 AI (ai.controller)
- **GET** `https://electrotrack-saas.onrender.com/ai/insights`

## 📋 Audit Logs (audit.controller)
- **GET** `https://electrotrack-saas.onrender.com/audit-logs`
- **GET** `https://electrotrack-saas.onrender.com/audit-logs/export`
- **GET** `https://electrotrack-saas.onrender.com/audit-logs/entity/:entityType/:entityId`

## 🔐 Authentication (auth.controller)
- **POST** `https://electrotrack-saas.onrender.com/auth/login`
- **POST** `https://electrotrack-saas.onrender.com/auth/refresh`
- **POST** `https://electrotrack-saas.onrender.com/auth/logout`
- **POST** `https://electrotrack-saas.onrender.com/auth/request-otp`
- **POST** `https://electrotrack-saas.onrender.com/auth/verify-otp`
- **POST** `https://electrotrack-saas.onrender.com/auth/verify-password`
- **POST** `https://electrotrack-saas.onrender.com/auth/password-reset/request`
- **POST** `https://electrotrack-saas.onrender.com/auth/password-reset/confirm`
- **POST** `https://electrotrack-saas.onrender.com/auth/fcm-token`

## 💸 Expenses (expenses.controller)
- **POST** `https://electrotrack-saas.onrender.com/expenses`
- **GET** `https://electrotrack-saas.onrender.com/expenses`
- **DELETE** `https://electrotrack-saas.onrender.com/expenses/:id`

## 📦 Inventory (inventory.controller)
- **GET** `https://electrotrack-saas.onrender.com/inventory/dashboard`
- **GET** `https://electrotrack-saas.onrender.com/inventory/categories`
- **GET** `https://electrotrack-saas.onrender.com/inventory/products`
- **GET** `https://electrotrack-saas.onrender.com/inventory/products/:id`
- **POST** `https://electrotrack-saas.onrender.com/inventory/products`
- **PATCH** `https://electrotrack-saas.onrender.com/inventory/products/:id`
- **GET** `https://electrotrack-saas.onrender.com/inventory/units`
- **GET** `https://electrotrack-saas.onrender.com/inventory/units/lookup/:serial`
- **POST** `https://electrotrack-saas.onrender.com/inventory/units`
- **POST** `https://electrotrack-saas.onrender.com/inventory/units/bulk`
- **PATCH** `https://electrotrack-saas.onrender.com/inventory/units/:id`
- **POST** `https://electrotrack-saas.onrender.com/inventory/products/:id/enrich`
- **DELETE** `https://electrotrack-saas.onrender.com/inventory/products/:id`
- **GET** `https://electrotrack-saas.onrender.com/inventory/suppliers`
- **POST** `https://electrotrack-saas.onrender.com/inventory/suppliers`
- **GET** `https://electrotrack-saas.onrender.com/inventory/purchase-orders`
- **POST** `https://electrotrack-saas.onrender.com/inventory/purchase-orders`
- **GET** `https://electrotrack-saas.onrender.com/inventory/grn/:id`
- **POST** `https://electrotrack-saas.onrender.com/inventory/grn`

## 🔔 Notifications (notifications.controller)
- **GET** `https://electrotrack-saas.onrender.com/notifications`
- **PATCH** `https://electrotrack-saas.onrender.com/notifications/read-all`
- **PATCH** `https://electrotrack-saas.onrender.com/notifications/:id/read`

## 📊 Reports (reports.controller)
- **GET** `https://electrotrack-saas.onrender.com/reports/sales-summary`
- **GET** `https://electrotrack-saas.onrender.com/reports/sales-summary/range`
- **GET** `https://electrotrack-saas.onrender.com/reports/stock-valuation`
- **GET** `https://electrotrack-saas.onrender.com/reports/low-stock`
- **GET** `https://electrotrack-saas.onrender.com/reports/staff-performance`
- **GET** `https://electrotrack-saas.onrender.com/reports/top-products`
- **GET** `https://electrotrack-saas.onrender.com/reports/dead-stock`
- **GET** `https://electrotrack-saas.onrender.com/reports/return-analytics`
- **POST** `https://electrotrack-saas.onrender.com/reports/cash-reconciliation`
- **GET** `https://electrotrack-saas.onrender.com/reports/cash-reconciliation/today`
- **GET** `https://electrotrack-saas.onrender.com/reports/cash-reconciliation`
- **PATCH** `https://electrotrack-saas.onrender.com/reports/cash-reconciliation/:id/review`
- **DELETE** `https://electrotrack-saas.onrender.com/reports/cash-reconciliation/:id`

## ↩️ Returns (returns.controller)
- **GET** `https://electrotrack-saas.onrender.com/returns`
- **GET** `https://electrotrack-saas.onrender.com/returns/:id`
- **POST** `https://electrotrack-saas.onrender.com/returns`
- **PATCH** `https://electrotrack-saas.onrender.com/returns/:id/approve`
- **PATCH** `https://electrotrack-saas.onrender.com/returns/:id/reject`

## 🌐 Public Sales (public-sales.controller)
- **GET** `https://electrotrack-saas.onrender.com/public/sales/:id`

## 💰 Sales (sales.controller)
- **GET** `https://electrotrack-saas.onrender.com/sales`
- **GET** `https://electrotrack-saas.onrender.com/sales/customers`
- **GET** `https://electrotrack-saas.onrender.com/sales/by-invoice/:invoiceNumber`
- **GET** `https://electrotrack-saas.onrender.com/sales/:id`
- **POST** `https://electrotrack-saas.onrender.com/sales`
- **POST** `https://electrotrack-saas.onrender.com/sales/customers`
- **POST** `https://electrotrack-saas.onrender.com/sales/:id/void`
- **PATCH** `https://electrotrack-saas.onrender.com/sales/:id/dispatch`
- **PATCH** `https://electrotrack-saas.onrender.com/sales/:id/deliver`
- **GET** `https://electrotrack-saas.onrender.com/sales/payouts/ledger`
- **POST** `https://electrotrack-saas.onrender.com/sales/payouts`
- **PATCH** `https://electrotrack-saas.onrender.com/sales/:id/return`

## ⚙️ Settings (settings.controller)
- **GET** `https://electrotrack-saas.onrender.com/settings`
- **PATCH** `https://electrotrack-saas.onrender.com/settings`

## 🏭 Suppliers (suppliers.controller)
- **GET** `https://electrotrack-saas.onrender.com/suppliers`
- **GET** `https://electrotrack-saas.onrender.com/suppliers/:id`
- **POST** `https://electrotrack-saas.onrender.com/suppliers`
- **PATCH** `https://electrotrack-saas.onrender.com/suppliers/:id`
- **GET** `https://electrotrack-saas.onrender.com/purchase-orders`
- **GET** `https://electrotrack-saas.onrender.com/purchase-orders/:id`
- **POST** `https://electrotrack-saas.onrender.com/purchase-orders`

## 🏢 Tenants (tenants.controller)
- **GET** `https://electrotrack-saas.onrender.com/tenants`
- **POST** `https://electrotrack-saas.onrender.com/tenants`
- **GET** `https://electrotrack-saas.onrender.com/tenants/:id`
- **PATCH** `https://electrotrack-saas.onrender.com/tenants/:id`
- **DELETE** `https://electrotrack-saas.onrender.com/tenants/:id`
- **PATCH** `https://electrotrack-saas.onrender.com/tenants/:id/restore`
- **POST** `https://electrotrack-saas.onrender.com/tenants/:id/renew`
- **POST** `https://electrotrack-saas.onrender.com/tenants/:id/reset-owner-password`
- **PATCH** `https://electrotrack-saas.onrender.com/tenants/:id/app-access`

## 👥 Users (users.controller)
- **GET** `https://electrotrack-saas.onrender.com/users`
- **POST** `https://electrotrack-saas.onrender.com/users`
- **PATCH** `https://electrotrack-saas.onrender.com/users/:id`
- **PATCH** `https://electrotrack-saas.onrender.com/users/:id/password`
- **DELETE** `https://electrotrack-saas.onrender.com/users/:id`
- **GET** `https://electrotrack-saas.onrender.com/users/:id/activity`
