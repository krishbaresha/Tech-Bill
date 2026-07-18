# TechBill Desktop Pro — Product Requirements Document
**Status:** Draft v1 — needs your confirmation on flagged assumptions before build starts.

---

## 1. Vision

Ek installable, offline-first desktop POS software jo TechBill webapp se zyada fast aur
powerful hai. Shopkeeper ka data hamesha uske apne disk par rehta hai (internet na ho
tab bhi kaam karta hai), aur jab internet aata hai to backend se khud sync ho jata hai.
Access sirf un logon ko milta hai jinko **Super Admin** license key issue kare — koi
"free download and use" nahi.

## 2. Users & Roles

| Role | Kahan | Kya karta hai |
|---|---|---|
| **Super Admin** | Existing Admin Panel (backend) | License keys generate karta hai, plan/expiry set karta hai, kisi bhi user ki license revoke/renew kar sakta hai |
| **Tenant Owner / Staff** | Desktop App | Webapp jaise hi credentials se login karta hai, license key activate karta hai, POS chalata hai |

## 3. Core Requirements

### 3.1 Installable Desktop App
- Windows (.exe/.msi) — primary target (Pakistan retail shops mostly Windows use karte hain)
- macOS (.dmg) — secondary
- Ek dusri website (marketing/download site — ye separate deliverable hai, is scope mein nahi) se download hoga

### 3.2 Offline-First Storage
- Poora POS data (products, inventory, sales, customers, credit, returns) **local disk par ek encrypted SQLite database** mein store hota hai
- App bina internet ke fully usable hai (sirf naya license activation ke liye pehli dafa internet chahiye)
- Jab internet available ho, background sync automatically chalta hai (silent, user ko interrupt nahi karta)

### 3.3 Licensing System

**Flow:**
1. Super Admin, Admin Panel mein jaake ek tenant/user select karta hai, ek **Plan** choose karta hai (jaise Basic/Pro/Enterprise), aur ek **expiry date** set karta hai
2. System ek license key generate karta hai — ye key **cryptographically signed** hoti hai (server ki private key se), isliye desktop app ise **bina internet ke bhi verify kar sakta hai**
3. User dusri website se software download karta hai
4. Pehli baar khulte waqt: app apne webapp wale email/password se login karwata hai (**iske liye internet chahiye hi hoga**, account exist check karne ke liye)
5. Login successful hone ke baad, agar koi valid license activate nahi hai, app ek "Enter License Key" screen dikhata hai
6. User license key paste karta hai → app usse offline verify karta hai (signature check + expiry check) → agar valid, poora app unlock ho jata hai
7. License key ek specific machine se bandhi hoti hai (**ASSUMPTION**, neeche dekho) taake ek key kai logon mein share na ho sake

**Expiry behavior — bilkul jaisa tumne bataya:**
- Jab license expire ho jaye (chahe internet ho ya na ho):
  - ❌ Nayi sale create nahi kar sakta
  - ✅ Purana data (past sales, reports, customers, inventory) **view** kar sakta hai — read-only
  - App ek clear banner dikhata hai: "License expired — renew karo sale continue karne ke liye"
- Renewal: Super Admin naya expiry set karke naya key generate karta hai (ya wahi key extend hoti hai — **ASSUMPTION**, confirm karo), user naya key paste karta hai, sale phir se enable ho jati hai

**License key format:** Ek encrypted/hashed string (Base64 encoded, signed token) — user ko ek dikhne mein random-lagta code milega jaise `TB-PRO-8X2K-...`, andar se ye ek signed payload hai jisme `{ tenantId, plan, expiresAt, deviceId, issuedAt }` hota hai.

### 3.4 Authentication
- Same login credentials jo webapp mein use hote hain (shared backend auth — koi separate account nahi banana)
- Login/logout desktop app se bhi ho sakta hai
- Ek baar login hone ke baad, session offline bhi kaam kare (cached credentials, encrypted) — taake roz internet na ho tab bhi user apna shift shuru kar sake

### 3.5 Feature Set
- Webapp ke sab existing POS features (sale, inventory, returns, credit, customers, reports, warranty, cash reconciliation)
- **Extra/upgraded vs webapp:**
  - Poori tarah offline-capable (webapp abhi Dexie.js se sirf partial offline queue karta hai)
  - Fast local-disk reads (koi network latency nahi routine operations mein)
  - Barcode scanner/thermal printer/cash-drawer direct hardware integration (webapp browser se ye mushkil hai)
  - Background auto-sync with conflict resolution
  - Local encrypted backups (auto-export)

## 4. License States (state machine)

```
   [No License] --(valid key entered)--> [Active]
                                             |
                                    (expiresAt reached)
                                             v
                                        [Expired] --(new/renewed key)--> [Active]
                                             |
                                    (Super Admin revokes)
                                             v
                                        [Revoked] --(new key issued)--> [Active]
```

- **Active:** full access
- **Expired:** read-only, sale creation blocked
- **Revoked:** Super Admin ne manually band ki (fraud/non-payment) — same as Expired behavior, but tracked separately in audit log

## 5. Key User Flows

1. **First install & activation** — download → login (online) → enter license key (offline-verifiable) → unlocked
2. **Daily offline use** — app khulta hai, cached session se auto-login, poora din bina internet ke sale karta hai, data local DB mein save hota hai
3. **Sync when back online** — internet aate hi background sync: local changes upload, server se latest data (naye products/price updates jo Owner ne webapp se kiye) download
4. **License expiry mid-day** — agar tumne 30-day expiry set ki thi aur wo waqt aa gaya, agle app restart (ya periodic check) par sale-lock lag jata hai, purana data dikhta rehta hai
5. **Super Admin revokes early** — agli baar app internet se connect ho (ya periodic forced check-in — dekho §7), revoke turant apply ho

## 6. Assumptions Made (please confirm/correct)

| # | Assumption | Kyun zaroori hai |
|---|---|---|
| A1 | License key ek single machine se bind hogi (hardware fingerprint) | Bina iske, ek key unlimited PCs par use ho sakti hai |
| A2 | Renewal = naya key generate hota hai (purani wali replace) | Tumne clearly nahi bataya renewal mechanism |
| A3 | App ko kam se kam har **14 din mein ek dafa** online hona chahiye (forced check-in) | Warna revoke/suspend kabhi apply nahi hoga agar user jaan-boojh kar offline rahe. Bina iske "super admin revoke kare to turant band ho" possible nahi hai pure-offline design mein |
| A4 | Ek tenant mein multiple staff members ek hi desktop license share karte hain (per-shop license, per-user nahi) | Tumne "owner ko license milegi" kaha, staff alag license nahi |
| A5 | Local DB encryption key device-specific hoti hai (agar disk chori ho, data kisi aur PC par nahi khulega) | Financial/customer data disk par plain-text store karna risky hai |
| A6 | Plans (Basic/Pro/Enterprise) waisi hi hongi jaisi webapp ke existing `SubscriptionPlan` model mein hain | Tumne naye plans specify nahi kiye |

## 7. Non-negotiable security note

Koi bhi purely-offline license system 100% tamper-proof nahi ho sakta — ek determined user
apna system clock rollback kar sakta hai ya binary patch kar sakta hai. Humara design isko
**bahut mushkil** banata hai (signed tokens, clock-rollback detection, forced periodic
check-ins) lekin "impossible to bypass" ka wada nahi kar sakta koi bhi engineer. Isliye A3
(forced check-in) important hai — pure trust-the-clock design se bachne ke liye.

## 8. Out of Scope (v1)

- Marketing/download website (alag project hai)
- Mobile version
- Multi-currency
- Payment gateway integration for license renewal payment (abhi manual — Super Admin renew karta hai)

## 9. Success Criteria

- App bina internet ke poora din chal sake, koi data loss na ho
- Sync hone ke baad server aur local data 100% match kare (no silent data loss)
- License expiry ke baad sale block ho jaye within one app-restart/check cycle, offline hone par bhi
- Existing webapp/backend production code kabhi break na ho is kaam ki wajah se (isliye naya folder)
