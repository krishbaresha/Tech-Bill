# Permission Matrix

## Purpose

Ye file exact permission keys define karti hai. Backend guards, frontend route checks, sidebar visibility, aur action buttons isi matrix ko follow karenge.

## Permission Keys

1. `pos.read` - POS page open karna.
2. `pos.sell` - Sale complete karna.
3. `pos.discount` - Discount apply karna within allowed limit.
4. `pos.void` - Sale void karna.
5. `inventory.read` - Products and units dekhna.
6. `inventory.write` - Products/units create or edit karna.
7. `inventory.delete` - Product deactivate/delete karna.
8. `suppliers.read` - Suppliers and purchase orders dekhna.
9. `suppliers.write` - Suppliers, PO, GRN create/edit karna.
10. `customers.read` - Customers dekhna.
11. `customers.write` - Customer create/edit karna.
12. `returns.read` - Returns dekhna.
13. `returns.create` - Return request create karna.
14. `returns.review` - Return approve/reject karna.
15. `reports.read` - Reports dashboard dekhna.
16. `reports.cash_reconciliation` - Cash reconciliation submit/review karna.
17. `users.read` - Workers dekhna.
18. `users.manage` - Workers create/edit/deactivate/reset password.
19. `users.permissions` - Worker permissions assign karna.
20. `settings.read` - Settings dekhna.
21. `settings.manage` - Settings update karna.
22. `audit.read` - Audit logs dekhna.
23. `notifications.read` - Notifications dekhna.
24. `notifications.manage` - Notifications mark/read/manage karna.
25. `warranty.read` - Warranty checker use karna.
26. `loyalty.read` - Loyalty data dekhna.
27. `loyalty.manage` - Loyalty rules/points manage karna.

## Default Templates

### Tenant Owner/Admin

Default: all tenant permissions.

### Cashier

1. `pos.read`
2. `pos.sell`
3. `customers.read`
4. `customers.write`
5. `returns.read`
6. `returns.create`
7. `notifications.read`
8. `warranty.read`

### Inventory Manager

1. `pos.read`
2. `inventory.read`
3. `inventory.write`
4. `suppliers.read`
5. `suppliers.write`
6. `notifications.read`
7. `warranty.read`

### Accountant

1. `reports.read`
2. `reports.cash_reconciliation`
3. `customers.read`
4. `notifications.read`
5. `audit.read`

### Technician

1. `inventory.read`
2. `warranty.read`
3. `returns.read`
4. `notifications.read`

## Page Mapping

1. `/pos` requires `pos.read`.
2. `/dashboard` requires `reports.read`.
3. `/inventory` requires `inventory.read`.
4. `/returns` requires `returns.read`.
5. `/reports` requires `reports.read`.
6. `/customers` requires `customers.read`.
7. `/suppliers` requires `suppliers.read`.
8. `/purchase-orders` requires `suppliers.read`.
9. `/grn` requires `suppliers.write`.
10. `/users` requires `users.read`.
11. `/settings` requires `settings.read`.
12. `/audit` requires `audit.read`.
13. `/warranty` requires `warranty.read`.
14. `/loyalty` requires `loyalty.read`.

## Action Mapping

1. Complete sale requires `pos.sell`.
2. Apply discount requires `pos.discount`.
3. Void sale requires `pos.void`.
4. Add/edit product requires `inventory.write`.
5. Delete/deactivate product requires `inventory.delete`.
6. Approve/reject return requires `returns.review`.
7. Create worker requires `users.manage`.
8. Reset worker password requires `users.manage`.
9. Assign worker permissions requires `users.permissions`.
10. Update shop settings requires `settings.manage`.

## Do Not Continue Until

Backend and frontend use these exact keys or this file is updated before implementation.
