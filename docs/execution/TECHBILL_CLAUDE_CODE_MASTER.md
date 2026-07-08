# PHASE 3 ONLY WARNING

Do not execute this file directly from a fresh repo state.

This file is now Phase 3 Stitch UI source material only. Before using it, complete:

1. `docs/execution/01_PHASE_0_PREFLIGHT_FIXES.md`
2. `docs/execution/02_PHASE_1_SAAS_AUTH_FOUNDATION.md`
3. `docs/execution/03_PHASE_2_PERMISSIONS_FRONTEND_ACCESS.md`

Execution source of truth:

1. Start with `docs/execution/00_README_EXECUTION_ORDER.md`.
2. Use `docs/execution/04_PHASE_3_STITCH_UI_SYNC.md` when you are ready for Stitch UI.

Mandatory overrides for every instruction below:

1. Do not preserve old auth/store/types if SaaS fields are required.
2. Auth response, frontend user type, JWT payload, and route guards must include `tenantId` and `permissions`.
3. Every API call, Prisma query, WebSocket room, notification, report, and UI action must respect tenant scope.
4. Every page and action must respect the permission matrix in `docs/execution/PERMISSION_MATRIX.md`.
5. Do not build production pages as mock-data-first. Use real APIs wherever the backend exists.
6. Preserve POS serial-number verification while applying Stitch product-grid/cart visuals.
7. Google auth must stay removed.

---

# ⚡ Tech Bill — Claude Code Master Conversion Plan
> Multi-Agent Architecture | React + Vite + TypeScript + Tailwind + GSAP
> Read PROJECT_REPORT.md before starting anything.

---

## HOW TO USE THIS FILE

Paste the **ORCHESTRATOR PROMPT** into Claude Code first.
Claude Code will spawn sub-agents automatically to handle each domain in parallel.
Each sub-agent has its own focused prompt below.

---

# ═══════════════════════════════════════════════
# ORCHESTRATOR PROMPT — PASTE THIS FIRST
# ═══════════════════════════════════════════════

```
You are the orchestrator for converting the Tech Bill POS Stitch HTML screens into a
fully working React + Vite + TypeScript application. The Stitch export is in:
  stitch_Tech Bill_pos_system/

Your job: coordinate 6 sub-agents working in parallel. Each agent owns one domain.
Do NOT write any code yourself. Delegate everything.

Read PROJECT_REPORT.md now for full project context before proceeding.

---

PARALLEL EXECUTION PLAN:

Spawn these 6 sub-agents simultaneously:

AGENT-1 "Foundation"    → Project setup, config, shared infrastructure
AGENT-2 "Layout"        → AppShell, Sidebar, Topbar, routing, RBAC
AGENT-3 "Auth"          → Login, OTP, auth store, protected routes  
AGENT-4 "Core Pages"    → Dashboard, POS, Inventory, Reports
AGENT-5 "Mgmt Pages"    → Customers, Returns, Suppliers, PO, GRN, Staff, Audit, Loyalty, Warranty, Settings, Users, Cash Reconciliation, Return Analytics
AGENT-6 "Modals+Fixes"  → All modals, bug fixes, GSAP, dark/light mode, final integration

EXECUTION ORDER:
Phase 1 (parallel): AGENT-1 + AGENT-2 + AGENT-3 start together
Phase 2 (after Phase 1): AGENT-4 + AGENT-5 start (need Foundation done)
Phase 3 (after Phase 2): AGENT-6 runs last (needs all pages done)

After all agents finish:
1. Run: npm run build
2. Fix ALL TypeScript errors (zero tolerance — no @ts-ignore allowed)
3. Run: npm run dev and verify all pages load
4. Report: list of every file created

Start now. Spawn AGENT-1, AGENT-2, AGENT-3 in parallel.
```

---

# ═══════════════════════════════════════════════
# AGENT-1: FOUNDATION
# ═══════════════════════════════════════════════

```
You are AGENT-1 (Foundation). Set up the entire project infrastructure.

Read PROJECT_REPORT.md for context. The existing frontend is at electrotrack-pos/.
You are REPLACING the UI layer only — keep all api/, store/auth.store.ts, types/index.ts intact.

---

## STEP 1 — Install Dependencies

cd electrotrack-pos

npm install gsap @types/gsap
npm install zustand
npm install react-router-dom
npm install axios
npm install socket.io-client
npm install html5-qrcode
npm install react-to-print
npm install date-fns
npm install lucide-react

---

## STEP 2 — tailwind.config.js

REPLACE entire tailwind.config.js with this exact config extracted from Stitch:

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'surface':                  '#0e1322',
        'surface-dim':              '#0e1322',
        'surface-bright':           '#343949',
        'surface-container-lowest': '#090e1c',
        'surface-container-low':    '#161b2b',
        'surface-container':        '#1a1f2f',
        'surface-container-high':   '#25293a',
        'surface-container-highest':'#2f3445',
        'surface-variant':          '#2f3445',
        'on-surface':               '#dee1f7',
        'on-surface-variant':       '#c7c4d7',
        'inverse-surface':          '#dee1f7',
        'inverse-on-surface':       '#2b3040',
        'background':               '#0e1322',
        'on-background':            '#dee1f7',
        'outline':                  '#908fa0',
        'outline-variant':          '#464554',
        'primary':                  '#c0c1ff',
        'on-primary':               '#1000a9',
        'primary-container':        '#8083ff',
        'on-primary-container':     '#0d0096',
        'primary-fixed':            '#e1e0ff',
        'primary-fixed-dim':        '#c0c1ff',
        'on-primary-fixed':         '#07006c',
        'on-primary-fixed-variant': '#2f2ebe',
        'inverse-primary':          '#494bd6',
        'surface-tint':             '#c0c1ff',
        'secondary':                '#d0bcff',
        'on-secondary':             '#3c0091',
        'secondary-container':      '#571bc1',
        'on-secondary-container':   '#c4abff',
        'secondary-fixed':          '#e9ddff',
        'secondary-fixed-dim':      '#d0bcff',
        'on-secondary-fixed':       '#23005c',
        'on-secondary-fixed-variant':'#5516be',
        'tertiary':                 '#2fd9f4',
        'on-tertiary':              '#00363e',
        'tertiary-container':       '#008395',
        'on-tertiary-container':    '#000608',
        'tertiary-fixed':           '#a2eeff',
        'tertiary-fixed-dim':       '#2fd9f4',
        'on-tertiary-fixed':        '#001f25',
        'on-tertiary-fixed-variant':'#004e5a',
        'error':                    '#ffb4ab',
        'on-error':                 '#690005',
        'error-container':          '#93000a',
        'on-error-container':       '#ffdad6',
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },
      spacing: {
        'stack-xs':  '4px',
        'stack-sm':  '8px',
        'stack-md':  '16px',
        'stack-lg':  '32px',
        'gutter':    '24px',
        'unit':      '4px',
        'margin':    '32px',
      },
      fontFamily: {
        'headline-xl':  ['Space Grotesk', 'sans-serif'],
        'headline-lg':  ['Space Grotesk', 'sans-serif'],
        'headline-md':  ['Space Grotesk', 'sans-serif'],
        'body-lg':      ['DM Sans', 'sans-serif'],
        'body-md':      ['DM Sans', 'sans-serif'],
        'body-sm':      ['DM Sans', 'sans-serif'],
        'label-mono':   ['JetBrains Mono', 'monospace'],
        'label-caps':   ['DM Sans', 'sans-serif'],
      },
      fontSize: {
        'headline-xl': ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg': ['32px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-md': ['20px', { lineHeight: '1.3', fontWeight: '500' }],
        'body-lg':     ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md':     ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm':     ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'label-mono':  ['13px', { lineHeight: '1.0', letterSpacing: '0.05em', fontWeight: '500' }],
        'label-caps':  ['12px', { lineHeight: '1.0', letterSpacing: '0.1em', fontWeight: '700' }],
      },
    },
  },
  plugins: [],
}

---

## STEP 3 — index.html

Add to <head>:
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>

---

## STEP 4 — src/index.css

REPLACE with:

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * { box-sizing: border-box; }
  html { font-size: 16px; }
  html.dark body { background-color: #0e1322; color: #dee1f7; }
  html.light body { background-color: #f8fafc; color: #0f172a; }
  body { font-family: 'DM Sans', sans-serif; overflow-x: hidden; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
  .material-symbols-outlined { font-variation-settings: 'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; line-height: 1; }
}

@layer components {
  /* ── Glassmorphism ── */
  .glass-card {
    background: rgba(255,255,255,0.05);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,0.08);
    transition: all 0.3s ease;
  }
  .glass-card:hover {
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-color: rgba(255,255,255,0.15);
    transform: translateY(-2px);
  }
  .glass-header {
    background: rgba(14,19,34,0.8);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .glass-modal {
    background: rgba(14,19,34,0.92);
    backdrop-filter: blur(32px);
    -webkit-backdrop-filter: blur(32px);
    border: 1px solid rgba(255,255,255,0.1);
  }
  .glass-sidebar {
    background: rgba(14,19,34,0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-right: 1px solid rgba(255,255,255,0.08);
  }

  /* Light mode overrides */
  html.light .glass-card {
    background: rgba(255,255,255,0.8);
    border-color: rgba(0,0,0,0.06);
  }
  html.light .glass-card:hover { border-color: rgba(0,0,0,0.12); }
  html.light .glass-header { background: rgba(248,250,252,0.9); border-color: rgba(0,0,0,0.08); }
  html.light .glass-sidebar { background: rgba(255,255,255,0.9); border-color: rgba(0,0,0,0.08); }

  /* ── Glow Effects ── */
  .glow-primary  { box-shadow: 0 0 20px rgba(192,193,255,0.15); }
  .glow-tertiary { box-shadow: 0 0 20px rgba(47,217,244,0.15); }
  .glow-error    { box-shadow: 0 0 20px rgba(255,180,171,0.2); }
  .glow-border-indigo { border-color: rgba(192,193,255,0.3) !important; }
  .glow-border-red    { border-color: rgba(255,180,171,0.4) !important; }

  /* ── Animations ── */
  .pulsing-dot {
    animation: pulse-dot 2s infinite;
  }
  @keyframes pulse-dot {
    0%   { transform:scale(0.95); box-shadow:0 0 0 0 rgba(47,217,244,0.7); }
    70%  { transform:scale(1);    box-shadow:0 0 0 6px rgba(47,217,244,0); }
    100% { transform:scale(0.95); box-shadow:0 0 0 0 rgba(47,217,244,0); }
  }
  .fraud-pulse { animation: pulse-red 2s infinite; }
  @keyframes pulse-red {
    0%,100% { box-shadow:0 0 0 0 rgba(255,180,171,0.4); }
    50%     { box-shadow:0 0 0 6px rgba(255,180,171,0); }
  }

  /* ── Status Pills ── */
  .status-pill { position:relative; padding-left:12px; }
  .status-pill::before {
    content:''; position:absolute; left:0; top:20%; bottom:20%;
    width:3px; border-radius:4px;
  }
  .status-success::before { background:#2fd9f4; }
  .status-warning::before { background:#ffb4ab; }
  .status-error::before   { background:#93000a; }

  /* ── High Risk Row ── */
  .high-risk-row { background:rgba(147,0,10,0.15) !important; }
  .high-risk-row:hover { background:rgba(147,0,10,0.25) !important; }

  /* ── Nav Active ── */
  .nav-active {
    background: rgba(128,131,255,0.15);
    color: #c0c1ff;
    border-left: 3px solid #c0c1ff;
  }
}

---

## STEP 5 — src/lib/gsap.ts

Create this file:

import gsap from 'gsap';

export const animatePageEnter = (selector: string) => {
  gsap.from(selector, {
    y: 20, opacity: 0, duration: 0.5,
    stagger: 0.08, ease: 'power2.out', clearProps: 'all',
  });
};

export const animateCards = (selector: string) => {
  gsap.from(selector, {
    y: 30, opacity: 0, duration: 0.6,
    stagger: 0.1, ease: 'power2.out', clearProps: 'all',
  });
};

export const animateRows = (selector: string) => {
  gsap.from(selector, {
    x: -20, opacity: 0, duration: 0.4,
    stagger: 0.05, ease: 'power1.out', clearProps: 'all',
  });
};

export const countUp = (el: HTMLElement, target: number, prefix = '', suffix = '') => {
  const obj = { val: 0 };
  gsap.to(obj, {
    val: target, duration: 1.5, ease: 'power1.out',
    onUpdate: () => { el.textContent = prefix + Math.round(obj.val).toLocaleString('en-PK') + suffix; },
  });
};

export const animateModal = (el: HTMLElement, onComplete?: () => void) => {
  gsap.from(el, {
    scale: 0.92, opacity: 0, y: 20, duration: 0.35,
    ease: 'back.out(1.4)', clearProps: 'all', onComplete,
  });
};

export const buttonPress = (el: HTMLElement) => {
  gsap.to(el, { scale: 0.96, duration: 0.1 });
  gsap.to(el, { scale: 1, duration: 0.1, delay: 0.1 });
};

export default gsap;

---

## STEP 6 — src/store/ui.store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light';
type NavPage =
  | 'dashboard' | 'pos' | 'inventory' | 'reports' | 'customers'
  | 'returns' | 'suppliers' | 'purchase-orders' | 'grn'
  | 'staff' | 'audit' | 'warranty' | 'loyalty' | 'users'
  | 'settings' | 'cash-reconciliation' | 'return-analytics';

interface Toast {
  id: string; type: 'success' | 'error' | 'warning' | 'info';
  title: string; message: string;
}

interface UIStore {
  theme: Theme;
  toggleTheme: () => void;
  activePage: NavPage;
  setActivePage: (p: NavPage) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  notifPanelOpen: boolean;
  toggleNotifPanel: () => void;
  toasts: Toast[];
  addToast: (t: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(next);
        set({ theme: next });
      },
      activePage: 'dashboard',
      setActivePage: (p) => set({ activePage: p }),
      sidebarOpen: true,
      setSidebarOpen: (v) => set({ sidebarOpen: v }),
      notifPanelOpen: false,
      toggleNotifPanel: () => set((s) => ({ notifPanelOpen: !s.notifPanelOpen })),
      toasts: [],
      addToast: (t) => {
        const id = crypto.randomUUID();
        set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
        setTimeout(() => get().removeToast(id), 4000);
      },
      removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
    }),
    { name: 'Tech Bill-ui', partialize: (s) => ({ theme: s.theme }) }
  )
);

---

## STEP 7 — src/store/cart.store.ts

import { create } from 'zustand';

export interface CartProduct {
  id: string; name: string; brand: string; spec: string;
  price: number; stock: number; category: string; emoji: string;
}
export interface CartItem {
  product: CartProduct; quantity: number; serial: string; price: number;
}
type PaymentMethod = 'cash' | 'card' | 'easypaisa' | 'jazzcash' | 'bank_transfer' | 'store_credit';

interface CartStore {
  items: CartItem[];
  paymentMethod: PaymentMethod | null;
  discount: number;
  invoiceNo: string;
  customerName: string;
  addItem: (p: CartProduct) => void;
  removeItem: (serial: string) => void;
  updateQty: (serial: string, qty: number) => void;
  setPaymentMethod: (m: PaymentMethod) => void;
  setDiscount: (n: number) => void;
  setCustomerName: (n: string) => void;
  clearCart: () => void;
  subtotal: () => number;
  total: () => number;
}

const genSerial = (p: CartProduct) =>
  `SN-${p.brand.slice(0,3).toUpperCase()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
const genInvoice = () =>
  `INV-${Date.now().toString(36).toUpperCase().slice(-5)}`;

export const useCartStore = create<CartStore>((set, get) => ({
  items: [], paymentMethod: null, discount: 0,
  invoiceNo: genInvoice(), customerName: '',
  addItem: (p) => {
    const exists = get().items.find((i) => i.product.id === p.id);
    if (exists) {
      set((s) => ({ items: s.items.map((i) =>
        i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i) }));
    } else {
      set((s) => ({ items: [...s.items, { product: p, quantity: 1, serial: genSerial(p), price: p.price }] }));
    }
  },
  removeItem: (serial) => set((s) => ({ items: s.items.filter((i) => i.serial !== serial) })),
  updateQty: (serial, qty) => set((s) => ({
    items: qty <= 0
      ? s.items.filter((i) => i.serial !== serial)
      : s.items.map((i) => i.serial === serial ? { ...i, quantity: qty } : i),
  })),
  setPaymentMethod: (m) => set({ paymentMethod: m }),
  setDiscount: (n) => set({ discount: n }),
  setCustomerName: (n) => set({ customerName: n }),
  clearCart: () => set({ items: [], paymentMethod: null, discount: 0, invoiceNo: genInvoice(), customerName: '' }),
  subtotal: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
  total: () => get().subtotal() - get().discount,
}));

---

## STEP 8 — src/data/mock.ts

Create comprehensive mock data. Use ₨ for ALL currency. Pakistan names only.
Include: PRODUCTS (10), TRANSACTIONS (10), CUSTOMERS (8), INVENTORY_UNITS (10),
RETURNS (5), NOTIFICATIONS (6), STAFF (6), SUPPLIERS (5), PURCHASE_ORDERS (5),
WEEKLY_REVENUE ([{day,amount}] x7), STAFF_PERFORMANCE, LOYALTY_CUSTOMERS.

ALL currency values are numbers (not strings). Format with:
  export const formatPKR = (n: number) => `₨ ${n.toLocaleString('en-PK')}`;

---

## DONE

Report to orchestrator: "AGENT-1 complete. Foundation ready."
```

---

# ═══════════════════════════════════════════════
# AGENT-2: LAYOUT (Sidebar + Topbar + Shell)
# ═══════════════════════════════════════════════

```
You are AGENT-2 (Layout). Build the shared app shell.
Wait for AGENT-1 to finish first. Read PROJECT_REPORT.md for RBAC rules.

Source: stitch_Tech Bill_pos_system/Tech Bill_dashboard_pro_glass_2/code.html
Copy the sidebar and topbar HTML EXACTLY — preserve every class.

---

## FILE: src/components/layout/Sidebar.tsx

Convert the <aside> block from dashboard_pro_glass_2 to React exactly.
- Width: fixed w-[260px]
- Class: glass-sidebar fixed h-full left-0 top-0 flex flex-col p-gutter z-50
- Logo: ⚡ bolt icon + "Tech Bill" + "Premium Retail"
- Nav sections: "General" and "Management" with labels

NAV ITEMS (complete list — this is the STANDARD for ALL pages):
GENERAL:
  dashboard   → dashboard icon → "Overview"
  pos         → point_of_sale → "POS Screen"
  inventory   → inventory_2   → "Inventory"      [badge: 3 amber]
  reports     → leaderboard   → "Reports & AI"
  customers   → group         → "Customers"
  returns     → assignment_return → "Returns"    [badge: 2 red]

MANAGEMENT:
  suppliers       → local_shipping    → "Suppliers"
  purchase-orders → receipt_long      → "Purchase Orders"
  grn             → move_to_inbox     → "GRN"
  staff           → badge             → "Staff"
  audit           → shield            → "Audit Log"
  warranty        → verified          → "Warranty"
  users           → manage_accounts   → "Users"        [owner only]
  settings        → settings          → "Settings"     [owner only]

Active state: bg-primary-container text-on-primary-container rounded-lg
Inactive: text-on-surface-variant hover:text-on-surface hover:bg-white/5 rounded-lg

Bottom:
- AI Assistant gradient button (from secondary-container to primary-container)
- User card: avatar image, "Krish Baresha", "Owner" label, green online dot

Use useUIStore for activePage + setActivePage.
Use useAuthStore for role-based nav visibility (owner only items).

---

## FILE: src/components/layout/Topbar.tsx

Convert <header> from dashboard_pro_glass_2 exactly.
- Class: glass-header sticky top-0 h-16 flex justify-between items-center px-gutter z-40
- Left: breadcrumb (Home > [PageTitle])
- Center: search bar (glass-card, search icon, "Search... ⌘K")
- Right:
  - Theme toggle button (dark_mode / light_mode icon) → useUIStore.toggleTheme()
  - Notification bell with red dot badge → useUIStore.toggleNotifPanel()
  - "+ New Sale" primary button → setActivePage('pos')

---

## FILE: src/components/layout/NotificationPanel.tsx

Slide-in panel from right when notifPanelOpen=true.
- Fixed right-0 top-0 h-full w-[380px] glass-modal z-60
- Header: "Notifications" + unread count badge + "Mark all read" + X close
- Filter pills: All | Unread | Sales | Stock | Returns
- Scrollable list of notifications from mock data
- Each item: colored icon circle + title bold + message muted + time + unread dot
- GSAP: panel slides in from right (x: 380 → 0)

---

## FILE: src/components/layout/ToastContainer.tsx

Fixed bottom-6 right-6 z-[100] flex flex-col gap-2.
Renders useUIStore.toasts.
Each toast: glass-card rounded-xl p-4 flex items-start gap-3 min-w-[280px]
GSAP: slide in from right on mount, fade out on remove.
Icons: check_circle (success) / error (error) / warning (warning) / info (info)
Colors: tertiary / error / amber / primary per type.

---

## FILE: src/components/layout/AppShell.tsx

REPLACE existing AppShell.tsx:

import { useUIStore } from '../../store/ui.store';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { NotificationPanel } from './NotificationPanel';
import { ToastContainer } from './ToastContainer';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme } = useUIStore();

  // Apply theme class to html element on mount and change
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
  }, [theme]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden ml-[260px]">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-gutter custom-scrollbar">
          {children}
        </main>
      </div>
      <NotificationPanel />
      <ToastContainer />
    </div>
  );
}

---

## FILE: src/App.tsx

REPLACE with:

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useUIStore } from './store/ui.store';
import { useAuthStore } from './store/auth.store';
import { AppShell } from './components/layout/AppShell';

// Lazy imports for all pages
const LoginPage         = lazy(() => import('./pages/auth/LoginPage'));
const OtpPage           = lazy(() => import('./pages/auth/OtpPage'));
const DashboardPage     = lazy(() => import('./pages/dashboard/DashboardPage'));
const PosPage           = lazy(() => import('./pages/pos/PosPage'));
const InventoryPage     = lazy(() => import('./pages/inventory/InventoryPage'));
const ReportsPage       = lazy(() => import('./pages/reports/ReportsPage'));
const CustomersPage     = lazy(() => import('./pages/customers/CustomersPage'));
const LoyaltyPage       = lazy(() => import('./pages/customers/LoyaltyPage'));
const ReturnsPage       = lazy(() => import('./pages/returns/ReturnsPage'));
const ReturnAnalyticsPage = lazy(() => import('./pages/returns/ReturnAnalyticsPage'));
const SuppliersPage     = lazy(() => import('./pages/suppliers/SuppliersPage'));
const PurchaseOrdersPage= lazy(() => import('./pages/suppliers/PurchaseOrdersPage'));
const GrnPage           = lazy(() => import('./pages/suppliers/GrnPage'));
const StaffPage         = lazy(() => import('./pages/staff/StaffPage'));
const AuditPage         = lazy(() => import('./pages/audit/AuditPage'));
const WarrantyPage      = lazy(() => import('./pages/warranty/WarrantyPage'));
const UsersPage         = lazy(() => import('./pages/users/UsersPage'));
const SettingsPage      = lazy(() => import('./pages/settings/SettingsPage'));
const CashReconciliationPage = lazy(() => import('./pages/reports/CashReconciliationPage'));

function RequireAuth({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRouter() {
  const { setActivePage } = useUIStore();
  // sync URL with sidebar state
  // (use useLocation to update activePage)

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/otp" element={<OtpPage />} />
      <Route path="/" element={<RequireAuth><AppShell><Outlet /></AppShell></RequireAuth>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<RequireAuth roles={['owner','accountant']}><DashboardPage /></RequireAuth>} />
        <Route path="pos" element={<RequireAuth roles={['owner','cashier','inventory_manager']}><PosPage /></RequireAuth>} />
        <Route path="inventory" element={<RequireAuth roles={['owner','inventory_manager']}><InventoryPage /></RequireAuth>} />
        <Route path="reports" element={<RequireAuth roles={['owner','accountant']}><ReportsPage /></RequireAuth>} />
        <Route path="cash-reconciliation" element={<RequireAuth roles={['owner','accountant']}><CashReconciliationPage /></RequireAuth>} />
        <Route path="customers" element={<RequireAuth roles={['owner','cashier']}><CustomersPage /></RequireAuth>} />
        <Route path="loyalty" element={<RequireAuth roles={['owner','cashier']}><LoyaltyPage /></RequireAuth>} />
        <Route path="returns" element={<RequireAuth roles={['owner','cashier']}><ReturnsPage /></RequireAuth>} />
        <Route path="return-analytics" element={<RequireAuth roles={['owner','accountant']}><ReturnAnalyticsPage /></RequireAuth>} />
        <Route path="suppliers" element={<RequireAuth roles={['owner','inventory_manager']}><SuppliersPage /></RequireAuth>} />
        <Route path="purchase-orders" element={<RequireAuth roles={['owner','inventory_manager']}><PurchaseOrdersPage /></RequireAuth>} />
        <Route path="grn" element={<RequireAuth roles={['owner','inventory_manager']}><GrnPage /></RequireAuth>} />
        <Route path="staff" element={<RequireAuth roles={['owner']}><StaffPage /></RequireAuth>} />
        <Route path="audit" element={<RequireAuth roles={['owner']}><AuditPage /></RequireAuth>} />
        <Route path="warranty" element={<RequireAuth roles={['owner','technician']}><WarrantyPage /></RequireAuth>} />
        <Route path="users" element={<RequireAuth roles={['owner']}><UsersPage /></RequireAuth>} />
        <Route path="settings" element={<RequireAuth roles={['owner']}><SettingsPage /></RequireAuth>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="h-screen flex items-center justify-center bg-background text-primary">Loading...</div>}>
        <AppRouter />
      </Suspense>
    </BrowserRouter>
  );
}

---

Report to orchestrator: "AGENT-2 complete. AppShell, Sidebar, Topbar, routing done."
```

---

# ═══════════════════════════════════════════════
# AGENT-3: AUTH PAGES
# ═══════════════════════════════════════════════

```
You are AGENT-3 (Auth). Build login and OTP screens.
Source files:
  stitch_Tech Bill_pos_system/Tech Bill_secure_login_glassmorphic/code.html
  stitch_Tech Bill_pos_system/Tech Bill_otp_verification_animated/code.html

Read existing src/store/auth.store.ts and src/api/client.ts. Keep them intact.
These pages render WITHOUT AppShell (no sidebar).

---

## FILE: src/pages/auth/LoginPage.tsx

Convert Tech Bill_secure_login_glassmorphic/code.html to React EXACTLY.
Preserve every class, every element. Convert HTML → JSX (className, htmlFor, etc.)

BUGS TO FIX during conversion:
- No sidebar/topbar on this page (standalone)
- Add dark/light theme toggle top-right (useUIStore.toggleTheme)
- Form submission: call existing POST /auth/login from api/client.ts
- On success: store user in auth.store, navigate to /dashboard
- On error: show error toast using useUIStore.addToast
- Input validation: email required + valid format, password min 6 chars
- Show spinner on button during loading

GSAP: on mount, animate card in (y:40 → y:0, opacity:0 → 1, duration:0.6)
Background: two radial gradient blobs (indigo + cyan) positioned top-right and bottom-left

---

## FILE: src/pages/auth/OtpPage.tsx

Convert Tech Bill_otp_verification_animated/code.html to React EXACTLY.

INTERACTIONS (must all work):
- 6 individual input boxes, auto-focus next on digit entry
- Backspace moves focus to previous input
- Paste support: paste 6 digits fills all boxes
- Countdown timer: starts 5:00, counts down, shows "Resend OTP" when 0
- On complete: call POST /auth/verify-otp, navigate to /dashboard
- GSAP: each input box bounces on fill (scale 0.8 → 1.1 → 1)

---

Report to orchestrator: "AGENT-3 complete. Auth pages done."
```

---

# ═══════════════════════════════════════════════
# AGENT-4: CORE PAGES
# ═══════════════════════════════════════════════

```
You are AGENT-4 (Core Pages). Build Dashboard, POS, Inventory, Reports.
Wait for AGENT-1 + AGENT-2 to finish.

For each page:
1. Read the corresponding Stitch HTML file
2. Convert HTML → React JSX EXACTLY (preserve all classes)
3. Replace all $ → ₨ using formatPKR() from data/mock.ts
4. Add GSAP animations (use lib/gsap.ts helpers)
5. Wire up mock data from data/mock.ts
6. Make all interactions work

---

## PAGE 1: src/pages/dashboard/DashboardPage.tsx
Source: Tech Bill_dashboard_pro_glass_2/code.html

Convert every section:
1. AI Insight Banner (pulsing-dot, indigo glow, 3 chips)
2. 4 Stat Cards (glass-card, top accent bar, icon box, countUp GSAP on mount)
3. Weekly Revenue Chart (7 bars, today=violet, GSAP animates bar heights from 0)
4. Top Products (progress bars, GSAP width animate from 0)
5. Recent Transactions table (hover rows, mono invoice IDs)
6. Live Activity Feed (timeline connector, icons, pulsing LIVE dot)
7. FAB button bottom-right (+New Sale → navigate to /pos)

GSAP on mount: animateCards('.glass-card'), animateRows('.timeline-item')

---

## PAGE 2: src/pages/pos/PosPage.tsx
Source: Tech Bill_universal_pos_system_2/code.html

Layout: flex h-[calc(100vh-64px)] overflow-hidden
Left: flex-1 overflow-y-auto (products)
Right: w-[380px] flex-shrink-0 glass-card (cart panel)

LEFT SIDE:
- Quick action row: 4 ghost buttons
- Category tabs (All/Laptops/Mobiles/Printers/Monitors/Accessories)
  → clicking a tab FILTERS the product grid
- Product grid (grid-cols-3 gap-4):
  Each card: glass-card, emoji, name, spec, price(₨), stock badge, "Add To Cart +" btn
  → clicking card: useCartStore.addItem() + GSAP scale flash

RIGHT CART PANEL:
- Header: "Current Sale" + invoice mono
- Customer input (text, controlled)
- Scrollable cart items list:
  Each: emoji + name + serial(mono cyan) + qty controls(-/+) + price + remove
  Empty state: centered icon + text
- Totals: Subtotal / Discount(amber) / line / Total(primary large)
- Payment 2x3 grid (Cash/Card/EasyPaisa/JazzCash/BankTransfer/StoreCredit)
  → selected = bg-primary text-on-primary
- "Complete Sale →" button:
  → validates: items.length > 0 && paymentMethod selected
  → if invalid: addToast error
  → if valid: show SaleCompleteModal, then clearCart
- "🖨 Print" + "⏸ Hold" ghost buttons row

SERIAL VERIFICATION PANEL (bottom of cart):
Each cart item shows serial + ✓ Verified green badge

---

## PAGE 3: src/pages/inventory/InventoryPage.tsx
Source: Tech Bill_inventory_management/code.html

Convert exactly:
1. AI Warning banner (amber, left border)
2. Toolbar: search input + filter tabs + Add Product btn + Bulk Import btn
3. Stats row (3 small cards)
4. Table: Serial(mono) | Product | Brand | Category | Purchase₨ | Sell₨ | Margin% | Days | Status badge | Actions
   - Filter tabs work: All/InStock/LowStock/DeadStock/Sold
   - Search filters by name or serial
   - Dead stock rows: subtle amber tint
   - Status badges: color coded
5. Pagination (prev/next, page X of Y)
6. Quick Add panel (right side collapsible)

GSAP: animateRows('.inventory-row') on mount and on filter change

---

## PAGE 4: src/pages/reports/ReportsPage.tsx
Source: Tech Bill_reports_ai_insights/code.html

Tabs (useState activeTab):
  Sales Summary | Staff Performance | AI Predictions | Dead Stock | Cash Reconciliation→link

TAB 1 Sales Summary:
- 3 KPI cards with countUp GSAP
- Revenue bar chart (weekly, GSAP animate bars)
- Payment method breakdown (horizontal progress bars, GSAP width from 0)
- 2 AI prediction cards (indigo glow)

TAB 2 Staff Performance:
- Table with score badges (green 90+, amber 75-89, red <75)
- GSAP stagger rows

TAB 3 AI Predictions:
- Forecast card with pulsing AI icon
- Reorder Now list
- Dead stock recommendations

TAB 4 Dead Stock:
- Table with GSAP rows
- "Apply Discount" action per row

---

Report to orchestrator: "AGENT-4 complete. Dashboard, POS, Inventory, Reports done."
```

---

# ═══════════════════════════════════════════════
# AGENT-5: MANAGEMENT PAGES
# ═══════════════════════════════════════════════

```
You are AGENT-5 (Management Pages). Build all remaining full pages.
Wait for AGENT-1 + AGENT-2 to finish.

For each page: read Stitch HTML → convert to React → fix $ → ₨ → add GSAP.

---

PAGES TO BUILD:

1. src/pages/customers/CustomersPage.tsx
   Source: Tech Bill_customer_database/code.html
   - 3 stat cards
   - Search filter (works live)
   - Table: Avatar+Name | Phone(mono) | Total₨ | Last Visit | Points | Tier badge | Actions
   - Tier badges: 🥉Bronze(amber) 🥈Silver(gray) 🥇Gold(yellow) 💎Platinum(cyan)
   - Click row → expand purchase history
   - GSAP: animateRows on mount

2. src/pages/customers/LoyaltyPage.tsx
   Source: Tech Bill_loyalty_rewards/code.html
   FIX: All $ → ₨ (lines 302,321,340,359,378)
   - AI banner
   - 4 stat cards (countUp GSAP)
   - 4 Tier cards (Bronze/Silver/Gold/Platinum) with progress bars
   - Leaderboard table
   - Points chart (grouped bars: Issued vs Redeemed per day)

3. src/pages/returns/ReturnsPage.tsx
   Source: Tech Bill_returns_fraud_detection/code.html
   FIX: All $ → ₨ (lines 481,488)
   - fraud-pulse animation on HIGH risk banner
   - Filter tabs (All/Pending/Approved/Rejected) — work
   - 3 stat cards
   - Return cards grid (fraud-pulse on HIGH, glow-border-red)
   - Approve/Reject buttons update local state
   - HIGH risk cards: class high-risk-row applied

4. src/pages/returns/ReturnAnalyticsPage.tsx
   Source: Tech Bill_return_loss_analytics/code.html
   - 4 KPI cards (countUp GSAP)
   - Returns by Reason chart (horizontal bars, GSAP width)
   - Return trend line chart
   - Product leaderboard table
   - Staff handling table
   - AI Fraud Patterns card (red glow)

5. src/pages/suppliers/SuppliersPage.tsx
   Source: Tech Bill_suppliers_management/code.html
   ADD GSAP (missing in original): animateCards + animateRows
   - 3 stat cards
   - Search + filter pills (All/Active/Inactive)
   - Table: Supplier | Contact | Phone(mono) | City | Active POs | Status | Actions
   - Quick Add panel right side

6. src/pages/suppliers/PurchaseOrdersPage.tsx
   Source: Tech Bill_purchase_orders/code.html
   - AI banner
   - Status tabs (All/Draft/Sent/Partial/Received/Overdue)
   - 4 stat cards
   - PO cards row (horizontal scroll for overdue)
   - Full PO table
   - Overdue rows: high-risk-row class

7. src/pages/suppliers/GrnPage.tsx
   Source: Tech Bill_goods_received_notes_grn/code.html
   ADD GSAP (missing in original): animateCards + animateRows
   ADD ₨: purchase cost column
   - 4 stat cards
   - Active GRN panel (indigo top border, items table with inputs)
   - Discrepancy warning if received ≠ expected
   - Past GRNs table

8. src/pages/staff/StaffPage.tsx
   Source: Tech Bill_staff_management/code.html
   ADD ₨: revenue figures in staff cards
   - 4 stat cards (countUp GSAP)
   - Filter tabs (All/Cashier/Inventory/Accountant/Technician)
   - Staff cards grid 3-col (GSAP stagger)
   - Recent Activity timeline bottom

9. src/pages/audit/AuditPage.tsx
   Source: Tech Bill_audit_log_security/code.html
   ADD GSAP (missing in original): animateRows('.audit-row')
   - Filter bar: date range + user dropdown + action type + search
   - 3 stat cards
   - Audit table (MONOSPACE heavy): time | user | action badge | entity ID | details | IP | risk
   - HIGH risk rows: high-risk-row class
   - Color-coded action badges
   - Pagination

10. src/pages/warranty/WarrantyPage.tsx
    Source: Tech Bill_warranty_checker/code.html
    - Search hero card (indigo glow border)
    - Result card: IN WARRANTY (green progress bar) or EXPIRED (red)
    - Details grid 2x2
    - Recent checks table

11. src/pages/settings/SettingsPage.tsx
    Source: Tech Bill_system_settings_hub/code.html
    - Left settings nav (260px)
    - Right content panel (switches based on active setting)
    - Shop Info form (controlled inputs)
    - AI Features toggles (cyan when ON, useUIStore)
    - Appearance: dark/light/system theme switcher
    - Save button → addToast success

12. src/pages/users/UsersPage.tsx
    Source: Tech Bill_users_access_management/code.html
    - Role filter tabs
    - Users table with actions
    - Edit slide-in panel (right side)

13. src/pages/reports/CashReconciliationPage.tsx
    Source: Tech Bill_cash_reconciliation/code.html
    ADD GSAP (missing): animateCards on mount
    - Today's reconciliation form card (controlled inputs)
    - Auto-calculate variance (expected - actual)
    - Variance display: green if 0, red if negative
    - AI Analysis card
    - History table

---

Report to orchestrator: "AGENT-5 complete. All management pages done."
```

---

# ═══════════════════════════════════════════════
# AGENT-6: MODALS + BUG FIXES + INTEGRATION
# ═══════════════════════════════════════════════

```
You are AGENT-6 (Modals, Bug Fixes, Final Integration).
Run AFTER all other agents finish.

---

## PART A — BUILD ALL MODALS

### src/components/modals/SaleCompleteModal.tsx
Source: Tech Bill_sale_complete_confirmation/code.html
- Full-screen overlay (fixed inset-0 bg-black/60 backdrop-blur-sm z-50)
- Modal card (glass-modal 480px, GSAP scale in 0.92→1 on mount)
- ✓ checkmark circle (GSAP draw animation using SVG strokeDashoffset)
- "Sale Complete!" heading
- Summary: customer, payment, items count, cashier
- Loyalty points earned row (if customer has loyalty)
- Serial numbers list (JetBrains Mono)
- Action buttons: Print / Email / New Sale
- Auto-close countdown (5s) visible as text "Closing in 5..."
- Props: { invoiceData: CartItem[], invoiceNo: string, total: number, onClose: () => void }

### src/components/modals/AddEditProductModal.tsx
Source: Tech Bill_add_edit_product_modal/code.html
- Dialog overlay (glass-modal 560px)
- GSAP: scale in on mount
- 2-column form: Name* | Brand | Category(select) | Selling Price₨* | Purchase Price₨
- Right col: SKU/Model | Warranty Months | Low Stock Threshold | Description | isActive toggle
- Image upload area (dashed border)
- Footer: Cancel ghost + Save primary
- Validation: required fields show red error text
- Props: { product?: Product, onSave: (p: Product) => void, onClose: () => void }

### src/components/modals/BarcodeScanner.tsx
Source: Tech Bill_barcode_qr_scanner_modal/code.html
FIX: Remove $12,482 — replace with "Scan to look up product or serial"
- Overlay + 400px modal (glass-modal)
- Scanner viewport with animated scanning line (GSAP y loop)
- Corner brackets (SVG, indigo)
- Manual entry input (JetBrains Mono)
- Recent scans list (last 3)
- html5-qrcode integration: useEffect mounts scanner, returns onScan(text)
- Props: { onScan: (text: string) => void, onClose: () => void }

### src/components/modals/InvoicePrintModal.tsx
Source: Tech Bill_invoice_print_modal/code.html
FIX: Add ₨ to ALL price/total/subtotal columns and values
- Overlay + 620px modal (glass-modal)
- Inside: white print-area div (for window.print())
- Shop header, customer info, items table with serials (mono)
- Totals section with ₨
- QR code placeholder box
- Footer text
- Screen buttons: Print (window.print()) / Email / Close
- Print CSS: @media print { .no-print { display: none } }
- GSAP: modal scales in on open
- Props: { saleData: CartItem[], invoiceNo: string, total: number, customer: string, paymentMethod: string }

---

## PART B — GLOBAL BUG FIXES

Apply these fixes across all files:

### FIX-1: Sidebar width standardized
In ALL page components, confirm the ml-[260px] offset on main container matches.
Sidebar is always w-[260px].

### FIX-2: Currency fix verification
Grep all .tsx files for any remaining $ followed by a digit: `\$[0-9]`
Replace every instance with ₨ equivalent using formatPKR().
Check these files especially:
  - LoyaltyPage.tsx (was lines 302,321,340,359,378)
  - ReturnsPage.tsx (was lines 481,488)
  - InvoicePrintModal.tsx (had no currency)
  - StaffPage.tsx (revenue column blank)
  - GrnPage.tsx (purchase cost blank)
  - BarcodeScanner.tsx (had $12,482)

### FIX-3: GSAP added to 4 missing screens
AuditPage.tsx: animateRows('.audit-row') on mount
CashReconciliationPage.tsx: animateCards('.glass-card') on mount
GrnPage.tsx: animateCards + animateRows on mount
SuppliersPage.tsx: animateCards + animateRows on mount

### FIX-4: Dark/Light mode wired
In main.tsx, on app load:
  const theme = localStorage.getItem('Tech Bill-ui')
    ? JSON.parse(localStorage.getItem('Tech Bill-ui')!).state?.theme ?? 'dark'
    : 'dark';
  document.documentElement.classList.add(theme);

### FIX-5: Pakistan timezone
In src/api/client.ts or wherever dates are formatted:
  Replace any T00:00:00Z → T00:00:00+05:00
  Replace any T23:59:59Z → T23:59:59+05:00

### FIX-6: Tech Bill branding on auth pages
LoginPage and OtpPage: include Tech Bill logo (⚡ + text) at top of card.
These are standalone pages — no sidebar — but must show the brand.

### FIX-7: Offline sync retry limit
In src/api/client.ts find the offline queue retry logic.
Add: if (item.retryCount >= 3) { moveToFailed(item); continue; }

### FIX-8: bank_transfer in POS
In PosPage.tsx payment methods array, ensure 'bank_transfer' is included.

---

## PART C — FINAL INTEGRATION CHECKS

1. Verify every page file exists:
   src/pages/auth/LoginPage.tsx ✓
   src/pages/auth/OtpPage.tsx ✓
   src/pages/dashboard/DashboardPage.tsx ✓
   src/pages/pos/PosPage.tsx ✓
   src/pages/inventory/InventoryPage.tsx ✓
   src/pages/reports/ReportsPage.tsx ✓
   src/pages/reports/CashReconciliationPage.tsx ✓
   src/pages/customers/CustomersPage.tsx ✓
   src/pages/customers/LoyaltyPage.tsx ✓
   src/pages/returns/ReturnsPage.tsx ✓
   src/pages/returns/ReturnAnalyticsPage.tsx ✓
   src/pages/suppliers/SuppliersPage.tsx ✓
   src/pages/suppliers/PurchaseOrdersPage.tsx ✓
   src/pages/suppliers/GrnPage.tsx ✓
   src/pages/staff/StaffPage.tsx ✓
   src/pages/audit/AuditPage.tsx ✓
   src/pages/warranty/WarrantyPage.tsx ✓
   src/pages/users/UsersPage.tsx ✓
   src/pages/settings/SettingsPage.tsx ✓
   src/components/modals/SaleCompleteModal.tsx ✓
   src/components/modals/AddEditProductModal.tsx ✓
   src/components/modals/BarcodeScanner.tsx ✓
   src/components/modals/InvoicePrintModal.tsx ✓

2. Verify every import in App.tsx resolves.

3. Run: npm run build
   - Fix every TypeScript error
   - No @ts-ignore allowed
   - No 'any' types allowed

4. Run: npm run dev
   - Open http://localhost:5173
   - Verify: login page renders, sidebar renders, dashboard loads
   - Verify: dark/light toggle works
   - Verify: POS cart add/remove works
   - Verify: toast notifications appear

5. Final grep for remaining bugs:
   grep -r '\$[0-9]' src/ --include='*.tsx' → must return 0 results
   grep -r 'TODO\|FIXME\|placeholder' src/ --include='*.tsx' → fix all

---

## PART D — DELIVERABLE

Create src/AGENT_REPORT.md listing:
- Every file created
- Every bug fixed
- Build status (pass/fail)
- Any remaining issues

Report to orchestrator: "AGENT-6 complete. All modals built, bugs fixed, build passing."
```

---

# ═══════════════════════════════════════════════
# EXECUTION SUMMARY
# ═══════════════════════════════════════════════

## What Each Agent Owns

| Agent | Domain | Files Created | Depends On |
|-------|--------|--------------|------------|
| AGENT-1 | Foundation | tailwind.config, index.css, gsap.ts, ui.store, cart.store, mock.ts | None |
| AGENT-2 | Layout | Sidebar, Topbar, AppShell, NotifPanel, Toast, App.tsx | AGENT-1 |
| AGENT-3 | Auth | LoginPage, OtpPage | AGENT-1 |
| AGENT-4 | Core Pages | Dashboard, POS, Inventory, Reports | AGENT-1 + AGENT-2 |
| AGENT-5 | Mgmt Pages | 13 pages | AGENT-1 + AGENT-2 |
| AGENT-6 | Integration | 4 modals + all bug fixes | ALL agents |

## Phase Timeline

```
Phase 1 (parallel): AGENT-1 + AGENT-2 + AGENT-3
Phase 2 (parallel): AGENT-4 + AGENT-5
Phase 3 (final):    AGENT-6
```

## All Bugs Being Fixed

| Bug | Fixed By |
|-----|---------|
| $ currency in Loyalty, Returns, POS, Invoice, Barcode, Staff, GRN | AGENT-6 |
| Sidebar width inconsistency (4 different widths) | AGENT-2 (standard w-[260px]) |
| GSAP missing on Audit, Cash Recon, GRN, Suppliers | AGENT-6 |
| Login screen had no code | AGENT-3 |
| Duplicate screens (3 dashboards, 2 logins, 3 POS, 2 OTPs) | All agents use best version |
| Dark/light mode not wired globally | AGENT-1 (store) + AGENT-6 (main.tsx) |
| Pakistan timezone UTC+5 | AGENT-6 |
| Offline sync retry loop | AGENT-6 |
| bank_transfer missing in POS | AGENT-6 |
| Invoice modal no currency | AGENT-6 |
| Staff revenue blank | AGENT-5 |
| GRN purchase price blank | AGENT-5 |
| Tech Bill branding missing on Returns, POS | AGENT-2 (shared topbar) |

## Screen → Component Mapping

| Stitch Screen | React Component | Agent |
|--------------|----------------|-------|
| secure_login_glassmorphic | LoginPage | 3 |
| otp_verification_animated | OtpPage | 3 |
| dashboard_pro_glass_2 | DashboardPage | 4 |
| universal_pos_system_2 | PosPage | 4 |
| inventory_management | InventoryPage | 4 |
| reports_ai_insights | ReportsPage | 4 |
| customer_database | CustomersPage | 5 |
| loyalty_rewards | LoyaltyPage | 5 |
| returns_fraud_detection | ReturnsPage | 5 |
| return_loss_analytics | ReturnAnalyticsPage | 5 |
| suppliers_management | SuppliersPage | 5 |
| purchase_orders | PurchaseOrdersPage | 5 |
| goods_received_notes_grn | GrnPage | 5 |
| staff_management | StaffPage | 5 |
| audit_log_security | AuditPage | 5 |
| warranty_checker | WarrantyPage | 5 |
| system_settings_hub | SettingsPage | 5 |
| users_access_management | UsersPage | 5 |
| cash_reconciliation | CashReconciliationPage | 5 |
| invoice_print_modal | InvoicePrintModal | 6 |
| add_edit_product_modal | AddEditProductModal | 6 |
| barcode_qr_scanner_modal | BarcodeScanner | 6 |
| sale_complete_confirmation | SaleCompleteModal | 6 |
| notification_center | NotificationPanel | 2 |
| dashboard_pro_glass_2 (topbar/sidebar) | AppShell | 2 |


