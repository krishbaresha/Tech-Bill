# Multi-Tenant Cross-Domain Logout Bug Fix
## TechBill SaaS: Session Persistence Race Condition Resolution

---

## 🐛 Problem Summary

**Issue:** Double-click logout bug in multi-tenant architecture
- User clicks "Sign Out" on tenant subdomain (e.g., `store.techbill.app`)
- Redirected to `techbill.app/login?logout=true`
- **Expected:** Login form with clean state
- **Actual:** Immediate redirect back to `store.techbill.app/dashboard`
- **Workaround Required:** User must click Sign Out a second time

**Root Cause:** Asynchronous race condition between module initialization and logout state destruction

---

## 🔍 Detailed Root Cause Analysis

### The Timeline of the Bug:

```
1. [Subdomain] User clicks "Sign Out"
   └─> AppShell.handleLogout() executes
   └─> window.location.href = "https://techbill.app/login?logout=true"
   └─> Full page load initiated

2. [Main Domain] Browser begins loading techbill.app/login
   └─> HTML parser encounters <script> tags
   └─> main.tsx STARTS to evaluate
   └─> BUT BEFORE circuit-breaker runs...

3. [Race Condition] Module imports begin
   ├─> import App from './App'
   │   └─> App.tsx imports useAuthStore from auth.store
   │   └─> auth.store instantiates Zustand with:
   │       └─> const [user] = useAuthStore.getState()
   │       └─> THIS READS localStorage.getItem('et-auth')
   │       └─> Gets the STALE token from earlier login!
   │
   └─> main.tsx circuit-breaker FINALLY runs:
       └─> localStorage.removeItem('et-auth') // TOO LATE!
       └─> Auth store already hydrated with old token

4. React mounts with user/accessToken set to non-null values

5. RequireAuth checks if (accessToken && user)
   └─> YES, both truthy
   └─> Immediately redirects to /dashboard
   └─> User bounced back to subdomain dashboard

6. User is now back where they started!
```

### Why Current Circuit-Breaker Failed:

The circuit-breaker logic in the **original** `main.tsx` was placed AFTER the imports:

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';  // ← Auth store hydrates HERE!

// Then circuit-breaker runs
if (typeof window !== 'undefined' && window.location.search.includes('logout=true')) {
    localStorage.removeItem('et-auth');  // ← Too late! Already hydrated
}
```

**Module evaluation order in JavaScript:**
1. All imports are executed top-to-bottom
2. Imported modules (App, AppShell, etc.) execute their own imports and module code
3. THEN the rest of the main.tsx file executes

The auth store initialization happened during step 1, before the circuit-breaker in step 3.

---

## ✅ Solution Implementation

### 1. **Absolute Top-Level Circuit-Breaker** (main.tsx)

**Key Change:** Move the logout detection to the ABSOLUTE top of main.tsx, before ANY imports.

```typescript
/**
 * ⚡ ABSOLUTE TOP-LEVEL CIRCUIT-BREAKER FOR MULTI-TENANT LOGOUT
 * 
 * This MUST execute before ANY module imports that read localStorage.
 * It runs synchronously at script parse-time.
 */
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  if (params.has('logout') && params.get('logout') === 'true') {
    // Clear ALL auth-related data synchronously
    localStorage.removeItem('et-auth');
    localStorage.removeItem('auth-storage');
    
    // Clear any other auth/token/session keys
    const keysToRemove = Object.keys(localStorage).filter(key => 
      key.includes('auth') || key.includes('token') || key.includes('session')
    );
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Clear session storage
    sessionStorage.clear();
    
    // Clear all cookies
    document.cookie.split(";").forEach((c) => {
      const cookieName = c.split("=")[0].trim();
      document.cookie = `${cookieName}=; max-age=0; path=/;`;
      if (window.location.hostname.includes('.')) {
        const parentDomain = '.' + window.location.hostname.split('.').slice(1).join('.');
        document.cookie = `${cookieName}=; max-age=0; path=/; domain=${parentDomain};`;
      }
    });
    
    // Strip logout flag from URL (prevents re-trigger on refresh)
    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }
}

// NOW safe to import (localStorage is already clean)
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// ... rest of imports
```

**Why This Works:**
- ✅ Executes BEFORE module evaluation chain begins
- ✅ Runs synchronously (no await, no promises)
- ✅ Clears localStorage before Zustand can read it
- ✅ URL flag is stripped, preventing refresh loops

---

### 2. **Hardened Logout Handler** (AppShell.tsx)

**Key Changes:**
- Clear auth store BEFORE redirect (not after)
- Always use `window.location.href` for hard redirects (not SPA router)
- Redirect to main domain logout endpoint on subdomain logout
- Redirect to login with logout flag on main domain logout

```typescript
const handleLogout = async () => {
  disconnectSocket();
  
  // 1. Revoke backend session
  try {
    await api.post('/auth/logout');
  } catch (e) {
    // Ignore backend errors; proceed with cleanup
  }
  
  // 2. Clear local state IMMEDIATELY
  clearAuth();
  
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost');
  
  // 3. Redirect to trigger circuit-breaker
  if (!isMainDomain(hostname)) {
    // On subdomain: redirect to main domain logout endpoint
    const protocol = isLocalhost ? 'http:' : 'https:';
    const rootDomain = getRootDomain(hostname);
    window.location.href = `${protocol}//${rootDomain}/login?logout=true`;
    return; // Critical: prevent further execution
  }
  
  // 4. On main domain: trigger circuit-breaker directly
  window.location.href = `${window.location.protocol}//${window.location.host}/login?logout=true`;
};
```

**Why This Works:**
- ✅ Uses `window.location.href` (full page reload), triggering circuit-breaker
- ✅ Early `return` prevents race conditions
- ✅ Backend session revoked before client cleanup
- ✅ Clear separation between subdomain and main domain flows

---

### 3. **Session Expiration Interceptor** (client.ts)

**Key Changes:**
- When token refresh fails, redirect to logout endpoint (not just `/login`)
- Ensures circuit-breaker is triggered even on automatic logouts

```typescript
catch (refreshErr) {
  processQueue(refreshErr, null);
  useAuthStore.getState().clearAuth();
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost');
  
  // Use logout circuit-breaker for clean state destruction
  if (!isMainDomain(hostname)) {
    const root = getRootDomain(hostname);
    const protocol = isLocalhost ? 'http:' : 'https:';
    window.location.href = `${protocol}//${root}/login?logout=true`;
  } else {
    // Even on main domain, use the circuit-breaker
    window.location.href = `${window.location.protocol}//${window.location.host}/login?logout=true`;
  }
  return Promise.reject(refreshErr);
}
```

---

### 4. **Login Component Guard** (Login.tsx)

**Key Changes:**
- Detect logout flag early in useEffect
- Force clear auth store even if tokens exist
- Prevent auto-redirect when logout flag present
- Strip flag from URL to prevent refresh loops

```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const hasLogoutFlag = params.get('logout') === 'true';
  
  // If logout flag exists, don't auto-redirect
  if (hasLogoutFlag) {
    useAuthStore.getState().clearAuth();
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }

  // Only auto-redirect if authenticated AND no logout flag
  if (user && accessToken && _hasHydrated) {
    // ... existing redirect logic
  }
}, [_hasHydrated, isHydrating, user, accessToken, navigate]);
```

---

## 🔄 Complete Logout Flow (Fixed)

```
1. [Subdomain] User clicks "Sign Out" on store.techbill.app/dashboard
   │
   ├─ AppShell.handleLogout()
   ├─ api.post('/auth/logout') [revoke refresh token on backend]
   ├─ clearAuth() [Zustand store cleared]
   └─ window.location.href = "https://techbill.app/login?logout=true"
   
2. [Main Domain] Full page reload begins
   │
   ├─ HTML parser starts script evaluation
   ├─ main.tsx CIRCUIT-BREAKER executes BEFORE any imports
   │  ├─ localStorage.removeItem('et-auth')
   │  ├─ sessionStorage.clear()
   │  ├─ All cookies cleared
   │  └─ URL history rewritten (logout flag removed)
   │
   ├─ Module evaluation begins (NOW safe - storage is empty)
   │  ├─ import App from './App'
   │  └─ Zustand hydrates from empty localStorage
   │      └─ user = null, accessToken = null
   │
   ├─ React mounts
   │  └─ RequireAuth sees user=null
   │     └─ Shows login form (not redirect)
   │
   └─ Login component renders with fresh state

3. User sees clean login form ✅
```

---

## 📋 Files Modified

| File | Changes | Purpose |
|------|---------|---------|
| `main.tsx` | Moved circuit-breaker to absolute top, before imports | Prevents auth store hydration from stale tokens |
| `AppShell.tsx` | Hardened logout handler, forced hard redirects | Ensures full page reload triggers circuit-breaker |
| `client.ts` | Updated token refresh error to use logout endpoint | Handles automatic logouts consistently |
| `Login.tsx` | Added logout flag detection before auto-redirect | Prevents redirect loops |

---

## 🧪 Testing Checklist

### Scenario 1: Manual Logout from Subdomain
- [ ] User logged in at `store.techbill.app/dashboard`
- [ ] Click "Sign Out"
- [ ] Should redirect to `techbill.app/login` (logout flag stripped from URL)
- [ ] Login form should display (NOT redirect to dashboard)
- [ ] Can log in fresh without double-clicking

### Scenario 2: Manual Logout from Main Domain
- [ ] User somehow at `techbill.app/dashboard` (shouldn't happen, but test it)
- [ ] Click "Sign Out"
- [ ] Should redirect to `techbill.app/login` with clean state
- [ ] Login form should display

### Scenario 3: Token Expiration (Auto-Logout)
- [ ] User logged in at `store.techbill.app`
- [ ] Let refresh token expire
- [ ] Make an API request
- [ ] Should trigger token refresh failure
- [ ] Should redirect to logout endpoint
- [ ] Should land on login form with clean state

### Scenario 4: Refresh During Logout Flag
- [ ] User at `techbill.app/login?logout=true`
- [ ] Press F5 to refresh
- [ ] Circuit-breaker runs again (idempotent)
- [ ] Should still see login form
- [ ] No redirect loops

### Scenario 5: Multiple Subdomains
- [ ] User at `store-a.techbill.app/dashboard`
- [ ] Click "Sign Out"
- [ ] Should redirect to `techbill.app/login?logout=true`
- [ ] Login form displays
- [ ] Log in with different tenant
- [ ] Should redirect to `store-b.techbill.app`

### Scenario 6: Back Button After Logout
- [ ] User logged out and sees login form
- [ ] Click browser back button
- [ ] Should NOT re-authenticate to previous store
- [ ] Should stay on login form

---

## 🚀 Deployment Notes

### Before Deploy:
1. Test all scenarios above in staging
2. Verify localStorage keys match actual Zustand store keys
3. Check cookie domain settings in browser devtools
4. Test on both localhost and production-like environments

### After Deploy:
1. Monitor error logs for "Failed to parse user from URL" errors
2. Check browser console for any auth-related warnings
3. Verify analytics still tracks logout events
4. Monitor subdomain redirect chains (should be single redirect, not multiple)

---

## 💡 Key Insights

### Why the Timeout Pattern Won't Work:
```typescript
// ❌ DON'T DO THIS - Still vulnerable to race conditions
setTimeout(() => {
  localStorage.removeItem('et-auth');
}, 0);
```
Even with `setTimeout(..., 0)`, module evaluation happens in the same tick. The circuit-breaker must be synchronous and at the top level.

### Why SPA Router Navigation Won't Work:
```typescript
// ❌ DON'T DO THIS - Doesn't trigger circuit-breaker
navigate('/login?logout=true');
```
React Router's `navigate()` is a SPA operation that doesn't reload the page, so `main.tsx` never re-runs. Must use `window.location.href`.

### Why Just Clearing Auth Store Isn't Enough:
```typescript
// ❌ INCOMPLETE - Store could be hydrated again
clearAuth();
navigate('/login');
```
If localStorage still contains tokens, Zustand will hydrate them during the next render cycle. Must clear localStorage BEFORE Zustand initialization.

---

## 📚 Related Documentation

- [Multi-Domain Architecture Guide](./multi_domain_architecture.md)
- [Zustand Persist Middleware](https://github.com/pmndrs/zustand/blob/main/docs/integrations/persisting-store-data.md)
- [HTML Script Loading Performance](https://developer.mozilla.org/en-US/docs/Web/Performance/Resource_Hints)

---

## ✨ Summary

The fix implements a **three-layer defense** against logout state desync:

1. **Top-Level Circuit-Breaker** (main.tsx): Synchronous, runs before modules load
2. **Hardened Logout Handler** (AppShell.tsx): Forces full page reloads via `window.location.href`
3. **Login Guard** (Login.tsx): Prevents auto-redirect loops when logout flag present

Together, these ensure that session destruction happens atomically and prevents any race conditions between subdomain logout and main domain state initialization.
