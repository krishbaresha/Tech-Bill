# Deactivate vs. Delete Product Logic

Based on your requirements, we need two distinct actions when removing a product from the active inventory. Because we must strictly **preserve historical sales records**, we cannot perform a forceful SQL "hard delete" on products or units that have been sold. 

Here is the plan to achieve exactly what you want safely:

## 1. UI Changes (Inventory Page)
I will update the "Deactivate Product" modal to present two clear choices:
- **Option A: Deactivate**
  - Just marks the product as `inactive`.
  - The units remain exactly as they are in the database.
- **Option B: Delete**
  - Shows a red warning box requiring you to type the word `DELETE` to confirm.
  - When confirmed, it will mark the product as `inactive` AND completely remove all available `in_stock` units.

## 2. Backend Logic Changes
I will update the `DELETE /inventory/products/:id` endpoint to accept an optional `?action=delete` flag.

### When `action = deactivate`:
- The backend simply sets `isActive = false` on the product (This is the current behavior).

### When `action = delete`:
- The backend sets `isActive = false` on the product.
- It finds all units for this product that are currently sitting `in_stock`.
- It **physically deletes** those `in_stock` units from the database. 
- *Why this is safe:* Since these units are merely `in_stock`, they have never been sold. Erasing them instantly updates your Inventory Cost and Retail values, but guarantees zero impact on old sales invoices or past records. Any units that *were* sold in the past are completely ignored by this deletion process.

## Open Question
Currently, the database only has an `isActive` flag for products, it does not have a "fully deleted" flag. This means that if you choose "Delete", the product will still be moved to your **"Inactive" tab** (just with 0 units). Is this acceptable, or do you want me to also hide "deleted" products from the Inactive tab completely? (If so, we'd need to modify the database schema).
