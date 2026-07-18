# techbill-pos/package.json — additions

Apne maujooda `techbill-pos/package.json` mein ye scripts aur dependencies add karo
(merge karo, overwrite mat karo — tumhari existing deps already sahi hain).

## scripts (add these)
```json
"tauri": "tauri",
"desktop:dev": "tauri dev",
"desktop:build": "tauri build",
"test": "vitest run",
"test:watch": "vitest"
```

## devDependencies (add these)
```json
"@tauri-apps/cli": "^2.1.0",
"vitest": "^2.1.4",
"@testing-library/react": "^16.0.1",
"@testing-library/jest-dom": "^6.6.3",
"jsdom": "^25.0.1",
"@sentry/vite-plugin": "^2.22.6"
```

## dependencies (add these)
```json
"@tauri-apps/api": "^2.1.1",
"@tauri-apps/plugin-updater": "^2.0.2",
"@tauri-apps/plugin-process": "^2.0.1",
"@tauri-apps/plugin-dialog": "^2.0.3",
"@sentry/react": "^8.42.0"
```

Install karne ke baad:
```bash
cd techbill-pos
npm install
npm run tauri icon path/to/logo.png   # 1024x1024 PNG se sab platform icons auto-generate karega
npm run desktop:dev                    # local desktop window test
```

Prerequisite (ek dafa system pe install karo): Rust toolchain — https://www.rust-lang.org/tools/install
Windows par WebView2 already installed hota hai Windows 10/11 mein.
