# Implementation & Testing Guide: Multi-Tenant Logout Bug Fix

---

## ✅ Pre-Implementation Checklist

### Code Review
- [ ] Review all modified files for syntax errors
- [ ] Verify imports are correct
- [ ] Check that circuit-breaker logic is at absolute top of main.tsx
- [ ] Confirm window.location.href is used (not navigate())
- [ ] Validate URL parameter handling

### Environment Setup
- [ ] Local development environment working
- [ ] Node.js version consistent
- [ ] npm/yarn cache cleared
- [ ] Zustand and auth store implementations reviewed
- [ ] Understood the current localStorage key names

### Team Alignment
- [ ] Product team aware of change
- [ ] Backend team confirms /auth/logout endpoint works
- [ ] QA has test plan ready
- [ ] Deployment strategy agreed upon

---

## 🔧 Implementation Steps

### Step 1: Update main.tsx (CRITICAL - Top Level)

**Verify:**
```typescript
// ✅ CORRECT: Circuit-breaker at TOP, BEFORE imports
/**
 * ⚡ ABSOLUTE TOP-LEVEL CIRCUIT-BREAKER
 */
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  if (params.has('logout') && params.get('logout') === 'true') {
    // ... cleanup code
  }
}

// THEN imports come AFTER
import { StrictMode } from 'react';
// ... rest of imports
```

**Common Mistakes:**
```typescript
// ❌ WRONG: Circuit-breaker after imports
import { StrictMode } from 'react';

if (window.location.search.includes('logout=true')) {
  localStorage.removeItem('et-auth');  // Too late!
}

// ❌ WRONG: Only checking includes() without get()
if (window.location.search.includes('logout')) {
  // This will match ?logout=false too!
}

// ✅ CORRECT: Explicit flag check
if (params.get('logout') === 'true') {
  // Only matches ?logout=true
}
```

### Step 2: Verify localStorage Key Names

**Action:** Search your codebase for the actual Zustand persist key:

```typescript
// Find your auth store file and check the persist config:
const useAuthStore = create(
  persist(
    (set) => ({...}),
    {
      name: 'YOUR_KEY_HERE'  // ← This is what you need
    }
  )
);
```

**Common patterns:**
- `'et-auth'` (ElectroTrack)
- `'auth-storage'` (Zustand default)
- `'app-auth'`
- `'auth-store'`

**Update:** Modify main.tsx to include your actual key:
```typescript
const actualKey = 'your-key-here';
localStorage.removeItem(actualKey);
localStorage.removeItem('auth-storage');  // Zustand default
localStorage.removeItem('et-auth');  // Common pattern
```

### Step 3: Update AppShell.tsx

**Verify handleLogout includes:**
- [ ] `disconnectSocket()` call
- [ ] Backend `api.post('/auth/logout')` call (with try/catch)
- [ ] `clearAuth()` before redirect
- [ ] Hard redirect using `window.location.href`
- [ ] Early `return` to prevent further execution
- [ ] Different handling for subdomain vs main domain

**Test the function logic:**
```typescript
// Pseudo-test
const mockLogout = () => {
  // 1. Socket disconnected ✓
  // 2. Backend called ✓
  // 3. State cleared ✓
  // 4. Redirected to logout endpoint ✓
  // 5. No further code executed ✓
};
```

### Step 4: Update client.ts

**Verify the token refresh error handler:**
- [ ] Uses same logout redirect pattern as AppShell
- [ ] Clears auth before redirect
- [ ] Checks for main vs subdomain
- [ ] Uses `?logout=true` flag

**Test the error path:**
```typescript
// When refresh token is invalid/expired:
// 1. processQueue(refreshErr, null) called
// 2. clearAuth() called
// 3. window.location.href = "...?logout=true"
// 4. Circuit-breaker will run on page load
```

### Step 5: Update Login.tsx

**Verify the logout flag detection:**
- [ ] Checks for `?logout=true` BEFORE checking auth state
- [ ] Forces `clearAuth()` if logout flag present
- [ ] Strips flag from URL using `window.history.replaceState`
- [ ] Returns early (doesn't auto-redirect)
- [ ] Normal auth-based redirect only if NO logout flag

**Test the logic:**
```typescript
useEffect(() => {
  if (hasLogoutFlag) {
    // ✓ Don't redirect to dashboard
    // ✓ Show login form
    // ✓ Return early
    return;
  }
  
  // Only runs if NO logout flag
  if (user && accessToken) {
    // ✓ Auto-redirect to dashboard
  }
}, [...]);
```

---

## 🧪 Testing Strategy

### Phase 1: Local Development Testing

#### Test 1A: Manual Logout from Subdomain
```
Pre-condition:
  - Logged in at http://store.localhost:5173/dashboard
  - Token exists in localStorage

Actions:
  1. Click "Sign Out"
  2. Observe redirect to http://localhost:5173/login?logout=true
  3. Observe URL changes to http://localhost:5173/login (flag stripped)
  4. Observe login form displays

Assertions:
  ✓ localStorage.getItem('et-auth') === null
  ✓ Window title/breadcrumbs show login page
  ✓ No redirect happens back to dashboard
  ✓ Can log in fresh
  ✓ Gets redirected to correct subdomain

Debug:
  - Open DevTools → Console
  - Check: localStorage.getItem('et-auth')
  - Check: useAuthStore.getState().user
```

#### Test 1B: Manual Logout from Main Domain
```
Pre-condition:
  - Somehow at http://localhost:5173/dashboard (unusual, test anyway)
  - Token exists in localStorage

Actions:
  1. Click "Sign Out"
  2. Observe redirect to http://localhost:5173/login?logout=true
  3. Observe URL changes to http://localhost:5173/login
  4. Observe login form displays

Assertions:
  ✓ Same as 1A
```

#### Test 2: Page Refresh During Logout
```
Pre-condition:
  - Just landed on http://localhost:5173/login?logout=true
  - Circuit-breaker just ran

Actions:
  1. Press F5 to refresh page
  2. Observe URL shows http://localhost:5173/login (no flag)
  3. Observe login form still displays

Assertions:
  ✓ Circuit-breaker runs again (idempotent)
  ✓ localStorage still empty
  ✓ No infinite redirects
  ✓ No error messages
```

#### Test 3: Token Expiration Auto-Logout
```
Pre-condition:
  - Logged in at http://store.localhost:5173/dashboard
  - Somehow invalidate refresh token in backend (or wait for expiry)

Actions:
  1. Make any API call that requires authentication
  2. Observe 401 response
  3. Observe token refresh fails
  4. Observe redirect to http://localhost:5173/login?logout=true

Assertions:
  ✓ Redirects to logout endpoint (not just /login)
  ✓ Circuit-breaker runs
  ✓ localStorage is cleared
  ✓ Login form displays
```

#### Test 4: Back Button After Logout
```
Pre-condition:
  - Logged in at http://store.localhost:5173/dashboard
  - Token exists

Actions:
  1. Click "Sign Out"
  2. Wait for login page to load
  3. Click browser back button

Assertions:
  ✓ Doesn't re-authenticate to previous store
  ✓ Stays on login form OR
  ✓ Goes back to landing page (site behavior)
  ✓ No auto-redirect to dashboard
  
Debug:
  - This tests browser history handling
  - Make sure replaceState vs pushState is correct
```

#### Test 5: Multiple Subdomains
```
Pre-condition:
  - Logged in as Store A at http://store-a.localhost:5173/dashboard

Actions:
  1. Click "Sign Out"
  2. Wait for login page
  3. Log in with Store B credentials
  4. Observe redirect to http://store-b.localhost:5173/dashboard

Assertions:
  ✓ Logout clears old Store A token
  ✓ New login sets Store B token
  ✓ Redirects to correct Store B subdomain
  ✓ No confusion between stores
  
Debug:
  - Check subdomain claim in JWT token
  - Verify user.subdomain matches window.location.hostname
```

#### Test 6: Concurrent Logout Attempts
```
Pre-condition:
  - Logged in at http://store.localhost:5173/dashboard

Actions:
  1. Click "Sign Out"
  2. Immediately click "Sign Out" again (before page unloads)
  3. Observe behavior

Assertions:
  ✓ No errors
  ✓ No duplicate redirects
  ✓ Final result is login page
  ✓ localStorage is properly cleared
```

### Phase 2: Cross-Domain Testing (Staging/Production)

#### Test 7: Staging Environment
```
Environment: https://staging.techbill.app

Pre-condition:
  - Logged in at https://store.staging.techbill.app/dashboard

Actions:
  1. Click "Sign Out"
  2. Verify redirect to https://staging.techbill.app/login?logout=true
  3. Verify cookie clearing across domains

Assertions:
  ✓ Cookies properly cleared with domain=.staging.techbill.app
  ✓ No cross-domain cookie leakage
  ✓ Subdomain cookie isolation maintained
```

#### Test 8: Production Environment
```
Environment: https://techbill.app

Pre-condition:
  - Logged in at https://tenant.techbill.app/dashboard

Actions:
  1. Click "Sign Out"
  2. Verify redirect to https://techbill.app/login?logout=true
  3. Verify all production cookies cleared

Assertions:
  ✓ All tenant cookies cleared
  ✓ Admin cookies cleared (if admin cookie exists)
  ✓ Main domain cookies cleared
```

### Phase 3: Edge Cases

#### Test 9: Invalid Logout Flag Values
```
Actions:
  1. Navigate to /?logout=false
  2. Navigate to /?logout=
  3. Navigate to /?logout=true&other=param

Assertions:
  ✓ Only ?logout=true triggers circuit-breaker
  ✓ Other values don't trigger cleanup
  ✓ Multiple params handled correctly
```

#### Test 10: localStorage Key Mismatch
```
Simulated Issue:
  - Zustand key is 'my-auth' but circuit-breaker removes 'et-auth'

Actions:
  1. Modify circuit-breaker to NOT remove the correct key
  2. Click logout
  3. Verify it fails

Assertions:
  ✓ Bug is caught by testing
  ✓ Shows importance of correct key names
  ✓ Demonstrates why wildcard removal is important
```

#### Test 11: Private Browsing / Incognito
```
Actions:
  1. Open in Incognito/Private window
  2. Login and logout
  3. Verify behavior

Assertions:
  ✓ Works the same as normal mode
  ✓ No permission errors
  ✓ localStorage clearing works in private mode
```

---

## 📊 Test Execution Template

### Test Case: [Test Name]

```markdown
| Attribute | Value |
|-----------|-------|
| **ID** | TEST-001 |
| **Title** | Manual Logout from Subdomain |
| **Priority** | CRITICAL |
| **Environment** | Local (localhost:5173) |
| **Precondition** | User logged in at store.localhost:5173/dashboard |

**Steps:**
1. Click "Sign Out" button
2. Observe page transitions
3. Check localStorage state
4. Attempt re-login

**Expected Results:**
- ✓ Redirected to localhost:5173/login?logout=true
- ✓ URL flag stripped to localhost:5173/login
- ✓ localStorage.getItem('et-auth') === null
- ✓ Login form displays
- ✓ Can login without double-click

**Actual Results:**
- [Fill after testing]

**Pass/Fail:** [ ] PASS [ ] FAIL

**Notes:**
[Add any observations, bugs, or surprises here]
```

---

## 🐛 Debugging Checklist

If tests fail, use this checklist:

### "Logout doesn't work - redirects immediately back to dashboard"
```
Diagnostic Steps:
□ Check if circuit-breaker is BEFORE imports in main.tsx
  → grep -n "import.*from" main.tsx | head -5
     First 5 imports should be AFTER circuit-breaker

□ Verify localStorage key is correct
  → localStorage.getItem('YOUR_KEY')
     Should match Zustand persist config

□ Check if Zustand is using persist middleware
  → Search for "persist(" in auth store

□ Verify clearAuth() actually removes tokens
  → After clearAuth(), check localStorage
     Should have no auth keys

□ Check RequireAuth logic
  → Confirm it checks both user && accessToken
     Not just one of them
```

### "Circuit-breaker runs but localStorage still has tokens"
```
Diagnostic Steps:
□ Verify the key name is correct
  → Update circuit-breaker to log removed keys:
     console.log('Removing key:', key)

□ Check if there are OTHER auth keys
  → Object.keys(localStorage).forEach(k => 
      if (k.includes('auth')) console.log(k)
    )

□ Ensure sessionStorage is also cleared
  → sessionStorage.clear() was called

□ Check for cross-origin storage
  → Are tokens stored somewhere else?
     (IndexedDB, Service Worker, etc?)
```

### "URL flag won't strip"
```
Diagnostic Steps:
□ Verify window.history.replaceState is called
  → Check browser DevTools Network tab
     Should see history update in console

□ Check URL encoding
  → Verify protocol, host, pathname are correct
  → Should produce: http://localhost:5173/login

□ Ensure replaceState is called BEFORE React mounts
  → Add console.log before replaceState call
     Should appear before React logs
```

### "Cookies not being cleared"
```
Diagnostic Steps:
□ Check cookie names in DevTools Application tab
  → What are the actual cookie names?

□ Verify domain attribute
  → Cookies set with domain=.techbill.app
     Need domain removal too

□ Check cookie path
  → Most cookies are path=/
     Circuit-breaker uses same path ✓

□ Test cookie clearing manually
  → document.cookie = "test=1; path=/"
  → document.cookie = "test=; max-age=0; path=/"
  → Verify test cookie gone
```

---

## 📈 Monitoring & Metrics

### Key Metrics to Track Post-Deployment

1. **Logout Funnel**
   ```
   - Clicks on "Sign Out" button
   - Successful redirects to login page
   - Redirects back to dashboard (should be 0)
   ```

2. **Session Duration**
   ```
   - Before fix: Users clicking logout twice
   - After fix: Users clicking logout once
   ```

3. **Error Rates**
   ```
   - 401 errors during logout flow
   - localStorage access errors
   - Cookie clearing failures
   ```

4. **User Feedback**
   ```
   - "Double logout bug" complaints should stop
   - Monitor support tickets for logout issues
   ```

### Logging to Add (Optional)

```typescript
// In circuit-breaker
console.log('[Logout Circuit-Breaker] Detected logout flag');
console.log('[Logout Circuit-Breaker] Cleared keys:', removedKeys);

// In AppShell.handleLogout
console.log('[AppShell] Initiating logout from', hostname);
console.log('[AppShell] Redirecting to', redirectUrl);

// In Login.useEffect
console.log('[Login] Logout flag detected:', hasLogoutFlag);
console.log('[Login] Skipping auto-redirect due to logout');
```

---

## 🚀 Deployment Checklist

### Pre-Deployment (2 days before)
- [ ] Run full test suite
- [ ] Code review completed
- [ ] All tests documented and passed
- [ ] Performance testing done (no slowdowns)
- [ ] Rollback plan documented

### Deployment Day
- [ ] Merge to main/production branch
- [ ] Verify CI/CD pipeline succeeds
- [ ] Deploy to staging first
- [ ] Run smoke tests on staging
- [ ] Monitor error logs for 30 minutes
- [ ] If all good: deploy to production
- [ ] Monitor error logs for 2 hours post-deployment

### Post-Deployment (First Week)
- [ ] Monitor "logout failed" error rates (should be 0)
- [ ] Check support tickets for logout complaints
- [ ] Verify analytics show single-click logouts
- [ ] Keep rollback plan ready for 1 week

---

## ✨ Success Criteria

The fix is successful when:

```
✅ User clicks "Sign Out" once
✅ Gets redirected to login page
✅ Login form displays
✅ Can log in to same or different store
✅ No automatic re-redirect to dashboard
✅ localStorage is clean
✅ No error messages in console
✅ No support tickets about "double logout"
✅ Analytics show improved logout flow
```

The fix has failed if:

```
❌ Users still need to click logout twice
❌ Redirect loops still occur
❌ localStorage still has auth tokens
❌ Error messages appear in console
❌ Support tickets increase for logout
❌ Authentication flow breaks for any role
❌ Subdomain routing doesn't work
```

---

## 📞 Support & Escalation

### If tests fail:

1. **Review the modifications** - Ensure all 4 files are correctly updated
2. **Check localStorage keys** - Verify you used the correct key names
3. **Debug circuit-breaker timing** - Add console.log to verify it runs first
4. **Review error logs** - Check browser console for specific errors
5. **Revert if needed** - This is a self-contained fix, easy to revert

### Questions?

- Review the detailed flow diagrams in `LOGOUT_FLOW_DIAGRAMS.md`
- Check the root cause analysis in `LOGOUT_BUG_FIX_SUMMARY.md`
- Review the actual code changes in the 4 modified files
