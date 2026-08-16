# TechBill — Claude Code ke liye instructions

Ye file Claude Code (terminal/desktop app) ko do — apne repo ke root mein rakh kar
bol do "is file ko follow karo" ya iska content directly prompt mein paste kar do.

Claude Code ye kar sakta hai jo main (chat wala Claude) nahi kar sakta: tumhare
real Windows/Mac machine par Rust install karna, actual .exe/.dmg build karna,
browser kholke tests chalana, aur jab tak sab hara (green) na ho tab tak loop mein
khud bugs fix karte rehna.

---

## Step 0 — Apply the fixes already found

```
git apply critical-fixes.patch
```
Ye 4 files fix karega: `sales.service.ts` (ek real syntax bug tha), `InvoiceModal.tsx`
(1MB ka html2pdf library ab lazy-load hota hai), aur do `data-testid` additions
taake automated tester kaam kare.

## Step 1 — Full-repo health check (dono projects)

```
cd techbill-api && npm install && npx prisma generate && npm run build && npm run lint && npm run test
cd ../techbill-pos && npm install && npm run typecheck && npm run build
```

Jo bhi error/warning aaye, ek-ek kar ke fix karo. Har fix ke baad dobara command
chalao confirm karne ke liye ke break nahi hua. Agar koi cheez samajh na aaye
(business logic ambiguous ho), mujhse pooch lo — guess mat karo, khaaskar
payment/inventory calculations mein.

## Step 2 — Desktop app banao (Tauri)

```
cd techbill-pos
# ye kit2/ aur pehle wala kit/ folder se files copy karo apne repo mein:
#   src-tauri/               (poora folder)
#   tests/e2e/                (poora folder)
#   playwright.config.ts
# PACKAGE_JSON_ADDITIONS.md follow karo — deps/scripts add karo package.json mein

# Rust install karo agar nahi hai (one-time):
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh    # Mac/Linux
# Windows ke liye: https://www.rust-lang.org/tools/install se rustup-init.exe

npm install
npm run tauri icon <path-to-a-1024x1024-logo.png>
npm run desktop:dev       # ek window khulni chahiye jisme TechBill POS chale
```

Agar window nahi khulti ya crash ho, error message poora paste karo aur khud debug
karo — build logs, Rust panic messages sab dhyan se padho.

## Step 3 — Automated tester chalao

```
cd techbill-pos
npx playwright install --with-deps chromium
# .env.e2e banao (tests/e2e/README.md dekho) staging test-account credentials ke sath
npx playwright test
```

Jo bhi test fail ho:
1. Pehle `npx playwright show-report` se screenshot/video dekho ke actually kya toota
2. Confirm karo ke ye real app bug hai, test ka galat selector nahi
3. App code mein fix karo, test dobara chalao
4. Jab tak sab tests pass na ho jayen, loop continue karo

Naye features ke liye naye spec files bhi likhte jao `tests/e2e/` mein — jitna zyada
coverage utna behtar. Priority order: checkout/payment flow > inventory/GRN > returns >
reports.

## Step 4 — CI mein daalo

`.github/workflows/` mein diye gaye `frontend-ci.yml`, `backend-ci.yml`,
`desktop-release.yml` copy karo. Confirm karo ke ye teeno GitHub Actions tab mein
green chal rahe hain (push kar ke check karo).

## Ongoing — "tester" ka role

Ab se, koi bhi naya feature ya bug-fix karne se pehle:
1. Related e2e/unit tests likho (ya existing update karo)
2. Feature/fix karo
3. `npm run test` + `npx playwright test` + `npm run build` — sab pass hona chahiye
4. Tabhi commit/push karo

Isse app "regression-proof" rahega — purana kaam todhe bina naya kaam add hoga.

---

## Important — apne aap se koi decision mat lena in cheezon mein:
- Payment/refund calculation logic
- Tenant data isolation (security-critical)
- Database schema migrations (data loss ka risk hota hai — pehle backup lena)
- Production `.env` secrets (kabhi commit mat karna)

Ye cheezein change karne se pehle mujhse (Krish se) confirm lo.
