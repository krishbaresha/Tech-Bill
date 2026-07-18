import { isTauriApp } from './platform';

/**
 * Best-effort: send an error to the desktop app's on-disk log
 * (`log_js_error` in `src-tauri/src/main.rs`, written into the same file
 * tauri-plugin-log already manages for the Rust side).
 *
 * A no-op in the browser webapp — there is no local file to write to there,
 * and adding a server-side error-reporting endpoint is a separate, larger
 * change this wasn't scoped to make. `console.error` (already called by
 * every caller of this function) remains the browser's only record, same as
 * before.
 */
export function reportError(message: string, extra?: { stack?: string; source?: string }): void {
  if (!isTauriApp()) return;
  void import('@tauri-apps/api/core')
    .then(({ invoke }) =>
      invoke('log_js_error', { message, stack: extra?.stack, source: extra?.source }),
    )
    .catch(() => {
      // The one place this must never throw: an error handler that itself
      // fails would surface as a second, more confusing error.
    });
}
