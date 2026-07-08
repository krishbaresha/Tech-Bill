# Phase 4: Quality Assurance & Production Release

## Purpose

The objective of this phase is to perform comprehensive end-to-end quality assurance (QA) validation on the TechBill system before deployment. This includes verifying SaaS multi-tenant isolation, checking role-based permission locks, testing POS checkout operations under online/offline transitions, auditing security vectors (e.g., password recovery rules and CORS origins), and confirming system compile success.

---

## Preconditions

1.  **Phases 0 through 3 Completed**: Rebranding, authorization boundaries, and Stitch dark glass layouts are fully integrated.
2.  **Test Environment Configured**: Set up a minimum of two separate tenant databases, with one tenant flagged as active and the second tenant flagged as suspended.
3.  **Test Profile Provisioning**: Create at least one admin account and two distinct worker profiles (e.g., Cashier, Inventory Manager) for each tenant.

---

## Targeted Files

This is a validation phase. Changes are restricted to resolving minor issues identified during testing.
*   Backend REST API services
*   Frontend client interface components
*   Database seeding utilities

---

## Detailed QA Verification Checklist

1.  **Compile Validations**:
    *   Verify both workspaces compile cleanly:
      ```bash
      cd electrotrack-api && npm run build
      cd ../electrotrack-pos && npm run build
      ```
2.  **Authentication and Tenant Status Resolution**:
    *   Log in with a platform admin, tenant owner, and cashier account, ensuring JWT scopes are assigned correctly.
    *   Confirm that users belonging to the suspended tenant are blocked during login and token refresh requests.
3.  **Password Reset Workflow Auditing**:
    *   Trigger self-serve resets from a tenant admin account using email-based OTP.
    *   Confirm that self-serve reset requests from regular cashier or tech worker accounts are blocked.
    *   Verify that a tenant owner can update worker passwords directly from the User Management panel.
4.  **Role-Based Access Control (RBAC) Gating**:
    *   Verify cashiers can run checkout transactions, but are blocked from user administration and financial reports.
    *   Verify inventory managers can configure products and GRNs, but cannot read analytics summaries unless explicitly granted.
    *   Verify accountants can read reports and reconciliations, but are blocked from checkout mutations.
5.  **Multi-Tenant Data Boundary Tests**:
    *   Confirm that Tenant A cannot retrieve, edit, delete, or create products, sales, returns, customers, audit logs, or notifications belonging to Tenant B.
6.  **POS Checkout Integrity**:
    *   Validate the serial-number hotpath search speed.
    *   Add items to the checkout cart, apply discounts, select payment options, and complete checkout.
    *   Generate and preview the invoice.
    *   Test offline cash queueing and automatic sync recovery when connectivity is restored.
7.  **Final Security Scan**:
    *   Execute ripgrep to ensure no legacy names, temporary placeholders, or corrupt characters remain in source files:
      ```bash
      rg -n "google|oauth" .
      rg -n "TODO|FIXME|placeholder" electrotrack-api\src electrotrack-pos\src
      rg -n "â|ð|Ã" electrotrack-api\src electrotrack-pos\src
      ```

---

## Acceptance Criteria

*   [ ] Backend API compiles cleanly without TypeScript type errors.
*   [ ] Frontend client compiles and packages successfully.
*   [ ] Multi-tenant isolation boundaries are verified (zero cross-tenant leaks).
*   [ ] Google OAuth routes and references are completely removed.
*   [ ] Role-based access controls correctly gate backend controllers and hide frontend widgets.
*   [ ] User password recovery controls are enforced.
*   [ ] Health check endpoint (`GET /health`) responds successfully under load.
