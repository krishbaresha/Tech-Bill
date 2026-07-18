// Prevents an additional console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// The webview reporting an uncaught JS error or unhandled promise
/// rejection. Almost all of this app's logic lives in the React frontend
/// (this Rust shell is intentionally thin), so a crash is far more likely to
/// be a JS exception than a Rust panic — this command is what gets one of
/// those into the same on-disk log tauri-plugin-log already writes for the
/// Rust side (its default targets include LogDir, so nothing else needs
/// configuring for the file to exist; see the frontend's `bootstrap.ts` for
/// where `window.onerror`/`unhandledrejection` call this).
#[tauri::command]
fn log_js_error(message: String, stack: Option<String>, source: Option<String>) {
    log::error!(
        target: "webview",
        "{message}{}{}",
        source.map(|s| format!(" ({s})")).unwrap_or_default(),
        stack.map(|s| format!("\n{s}")).unwrap_or_default(),
    );
}

fn main() {
    // A Rust-side panic still aborts immediately (`panic = "abort"` in
    // Cargo.toml, deliberately — see that file), but this guarantees a log
    // line is written before it does, so "the app just vanished" becomes a
    // recorded panic message and location instead of nothing at all.
    std::panic::set_hook(Box::new(|info| {
        log::error!(target: "panic", "{info}");
    }));

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![log_js_error])
        // Only one TechBill window per machine — prevents duplicate cash-drawer
        // sessions / double socket connections on the same POS terminal.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            use tauri::Manager;
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .setup(|app| {
            // Auto-check for updates 3s after launch, silent unless one is found.
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_updater::UpdaterExt;
                tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                if let Ok(updater) = handle.updater() {
                    if let Ok(Some(update)) = updater.check().await {
                        let _ = update.download_and_install(|_, _| {}, || {}).await;
                    }
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running TechBill desktop app");
}
