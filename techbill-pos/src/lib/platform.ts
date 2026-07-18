/**
 * True when this code is running inside the packaged Tauri desktop shell,
 * not the browser webapp.
 *
 * `__TAURI_INTERNALS__` is injected by the Tauri runtime into every webview
 * it controls, on every OS — checking for it (rather than a hostname string
 * like `tauri.localhost`, which is Windows-specific and only true for a
 * *built* app, not `tauri dev`) is the portable way to detect "am I desktop."
 *
 * Why this matters: the desktop app has no multi-tenant subdomain routing —
 * it's always one fixed origin regardless of which shop is logged in — so
 * any auth/navigation logic written for the browser webapp's
 * `{subdomain}.techbill.app` model (see `lib/domain.ts`) must not run here.
 */
export function isTauriApp(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
