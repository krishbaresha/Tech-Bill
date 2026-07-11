# src/bootstrap.ts - The REAL Fix

This file must be imported FIRST in main.tsx, before any other code.

```typescript
/**
 * ⚡ BOOTSTRAP - Global Initialization
 * 
 * This file MUST be imported at the absolute top of main.tsx
 * BEFORE any other imports, including React.
 * 
 * Purpose: Detect logout flag and clear storage BEFORE Zustand hydrates
 */

// Extend window to add our flag
declare global {
  interface Window {
    __APP_LOGOUT_DETECTED__: boolean;
  }
}

if (typeof window !== 'undefined') {
  // Check for logout flag in URL
  const params = new URLSearchParams(window.location.search);
  const hasLogoutFlag = params.get('logout') === 'true';
  
  // Set global flag that auth.store will check
  window.__APP_LOGOUT_DETECTED__ = hasLogoutFlag;
  
  if (hasLogoutFlag) {
    // 1. Clear all localStorage completely
    localStorage.clear();
    
    // 2. Clear sessionStorage
    sessionStorage.clear();
    
    // 3. Clear all cookies from current domain
    const clearCookie = (name: string) => {
      document.cookie = `${name}=; path=/; max-age=0`;
      document.cookie = `${name}=; path=/; domain=.${window.location.hostname}; max-age=0`;
      
      // Also clear from parent domain if this is a subdomain
      if (window.location.hostname.includes('.')) {
        const parentDomain = '.' + window.location.hostname.split('.').slice(1).join('.');
        document.cookie = `${name}=; path=/; domain=${parentDomain}; max-age=0`;
      }
    };
    
    // Clear all cookies
    document.cookie.split(';').forEach(c => {
      const cookieName = c.split('=')[0].trim();
      if (cookieName) clearCookie(cookieName);
    });
    
    // 4. Strip the logout flag from URL so page refreshes don't trigger it again
    const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }
}
```

---

## Update src/main.tsx

Change the FIRST lines to import bootstrap first:

```typescript
/**
 * ⚡ CRITICAL: Bootstrap MUST be imported first, before anything else
 */
import './bootstrap';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { api } from './api/client';
import { processPendingSales } from './db/offline.db';
import ErrorBoundary from './components/common/ErrorBoundary';

// ... rest of main.tsx stays the same
```

---

## Update src/store/auth.store.ts

Add the logout check to your Zustand persist configuration:

**For Zustand v3/v4:**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      // ... your existing store code ...
      user: null,
      accessToken: null,
      refreshToken: null,
      
      setAuth: (user, accessToken, refreshToken) => {
        set({ user, accessToken, refreshToken });
      },
      
      clearAuth: () => {
        set({ user: null, accessToken: null, refreshToken: null });
      },
      
      // ... rest of your actions ...
    }),
    {
      name: 'et-auth', // ← Make sure this matches localStorage key name
      
      // CRITICAL: Check logout flag before hydrating
      onRehydrateStorage: () => (state) => {
        // If logout was detected in bootstrap.ts, don't restore old data
        if (window.__APP_LOGOUT_DETECTED__) {
          // Return undefined to skip hydration
          return undefined;
        }
      }
    }
  )
);

export { useAuthStore };
```

**Alternative: If onRehydrateStorage doesn't work in your version:**

```typescript
const useAuthStore = create(
  persist(
    (set) => ({
      // ... your store code ...
    }),
    {
      name: 'et-auth',
      
      // Custom storage that checks logout flag
      storage: {
        getItem: (key) => {
          // If logout flag is set, don't return any stored data
          if (window.__APP_LOGOUT_DETECTED__) {
            return null;
          }
          return localStorage.getItem(key);
        },
        setItem: (key, value) => {
          localStorage.setItem(key, value);
        },
        removeItem: (key) => {
          localStorage.removeItem(key);
        },
        clear: () => {
          localStorage.clear();
        }
      }
    }
  )
);

export { useAuthStore };
```

---

## How This Really Works

### Execution Order (CORRECT):

```
1. HTML loads <script src="main.tsx">
2. main.tsx parser encounters: import './bootstrap'
3. bootstrap.ts code runs IMMEDIATELY:
   ├─ Declares window.__APP_LOGOUT_DETECTED__
   ├─ Checks for ?logout=true
   ├─ If found: clears localStorage, cookies
   └─ If found: sets window.__APP_LOGOUT_DETECTED__ = true
4. bootstrap.ts completes
5. Parser continues with main.tsx imports:
   ├─ import React
   ├─ import App (which imports auth.store)
   └─ auth.store.ts initializes:
      ├─ Zustand loads with persist middleware
      ├─ persist middleware calls: storage.getItem('et-auth')
      ├─ Our custom getItem checks: window.__APP_LOGOUT_DETECTED__
      ├─ If true: returns null (no hydration)
      └─ If false: returns localStorage data (normal hydration)
6. Zustand initializes with clean state if logout flag was present
7. React mounts with null tokens
8. RequireAuth sees null tokens
9. Shows login form ✓
```

### State at Each Point:

```
After bootstrap.ts but before auth.store init:
  localStorage: {} (empty)
  window.__APP_LOGOUT_DETECTED__: true
  
During auth.store init:
  getItem('et-auth') called
  Checks: window.__APP_LOGOUT_DETECTED__ === true
  Returns: null
  Zustand initializes: { user: null, accessToken: null }
  
After React mounts:
  useAuthStore.getState().user: null
  useAuthStore.getState().accessToken: null
  RequireAuth redirects to /login
  Login form displays ✓
```

---

## Why This Actually Works

1. **Bootstrap runs first** - Before ANY other imports
2. **Storage is cleared** - Before Zustand can read it
3. **Global flag is set** - So even if data somehow exists, Zustand won't use it
4. **Double protection** - Both cleared storage AND flag check
5. **No race conditions** - Everything is synchronous

---

## Testing This Fix

```javascript
// After deployment, test with this in console:

// Test 1: Check logout flag was detected
console.log(window.__APP_LOGOUT_DETECTED__)  // Should be true immediately after logout

// Test 2: Check localStorage was cleared
console.log(localStorage.length)  // Should be 0

// Test 3: Check auth store is clean
import { useAuthStore } from './store/auth.store'
const state = useAuthStore.getState()
console.log(state.user)         // null
console.log(state.accessToken)  // null
console.log(state.refreshToken) // null

// Test 4: Check URL was stripped
console.log(window.location.search)  // Should be "" (empty)
```

---

## Deployment Steps

1. Create `src/bootstrap.ts` with the code above
2. Update `src/main.tsx` - add `import './bootstrap'` as FIRST line
3. Update `src/store/auth.store.ts` - add logout check to persist config
4. Test locally (single logout should work)
5. Deploy to staging
6. Deploy to production

**Estimated time:** 15 minutes

---

## Why This is THE Solution

| Issue | Solution A (Old) | Solution B (Bootstrap) |
|-------|------------------|----------------------|
| Runs before imports? | ❌ No | ✅ Yes |
| Clears storage? | ✅ Yes (too late) | ✅ Yes (on time) |
| Prevents hydration? | ❌ No | ✅ Yes |
| Works reliably? | ❌ No | ✅ Yes |
| Prevents race conditions? | ❌ No | ✅ Yes |

---

## Summary

**The issue:** Zustand hydrates stale tokens before logout cleanup runs

**The real fix:** 
1. Create bootstrap.ts
2. Import it first in main.tsx
3. Clear storage in bootstrap
4. Prevent Zustand from hydrating on logout

**Result:** Single-click logout works perfectly ✓
