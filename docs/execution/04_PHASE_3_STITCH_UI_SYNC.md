# Phase 3: Stitch UI Synchronization

## Purpose

The objective of this phase is to integrate the Stitch dark glassmorphism user interface design system into the React frontend application. This integration must be completed without disrupting SaaS multi-tenant isolation, tenant context scoping, role-based route permissions, or backend API data flows. The `docs/execution/TECHBILL_CLAUDE_CODE_MASTER.md` file serves as reference source material and is not a direct execution plan.

---

## Preconditions

1.  **Phases 0, 1, and 2 Completed**: The SaaS authentication foundation, route guards, and permissions structures are fully operational.
2.  **Compilation Health**: Both applications compile successfully before visual migration begins.

---

## Targeted Files

### Frontend Client
*   Tailwind CSS configurations & global CSS files (`tailwind.config.ts`, `src/index.css`)
*   AppShell layout components (Sidebar, Topbar)
*   POS transaction views, product grids, cart sheets, and payment forms
*   Administration interfaces (Dashboard, Inventory, Reports, Returns, Customers, Suppliers, Users, Audit Logs, Settings)
*   Overlay Dialogs (Invoice print screens, OTP prompts, barcode scanner sheets)

---

## Detailed Task Checklist

1.  **Integrate Dark Design Tokens**:
    *   Merge design system tokens (colors, font weights, shadows, border-radii) from the Stitch guidelines.
    *   Maintain existing Tailwind configuration structures.
2.  **Global Style Configurations**:
    *   Define global CSS styles for glassmorphic elements (`backdrop-filter` rules, subtle borders, high-contrast text layers).
    *   Remove corrupt character encodings (mojibake) during file updates.
3.  **Refactor AppShell Layout**:
    *   Ensure the AppShell sidebar navigation elements are gated by permission checks.
    *   Display the active tenant name and user profile context dynamically in the header bar.
    *   Ensure notification bell alerts are scoped to the logged-in tenant.
4.  **Rebuild POS Screen**:
    *   Migrate POS elements to the dark grid cart configuration.
    *   Preserve the serial-number hotpath search validation and active unit checkout transactions.
    *   Retain all available payment methods (Cash, Easypaisa, JazzCash, Card, Bank Transfer).
5.  **Refactor Core Modules**:
    *   Apply the updated glassmorphic layouts to the Dashboard, Inventory tables, Reports views, and Returns request panels.
    *   Apply updated styling across Customers, Loyalty points registry, Suppliers, Purchase Orders, Goods Received Notes (GRN), Audit Logs, and Warranty lookup pages.
6.  **Data Isolation & Scope Enforcement**:
    *   Ensure all API calls utilize live database feeds (do not fall back to static mock data on production pages).
    *   Verify that query parameters use scoped tenant credentials.
7.  **Verify Compilation**:
    *   Build the frontend codebase to verify compilation sanity:
      ```bash
      cd electrotrack-pos && npm run build
      ```

---

## Acceptance Criteria

*   [ ] The application interface is aligned with the dark glassmorphic design theme.
*   [ ] Scanned serial number checkout functions are fully operational.
*   [ ] Worker permission structures hide and block restricted pages and controls.
*   [ ] Tenant data boundaries are respected on all views.
*   [ ] Frontend and backend applications compile cleanly.
