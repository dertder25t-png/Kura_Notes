use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder, WindowEvent};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

const CAPTURE_WINDOW_LABEL: &str = "capture";

pub fn install_global_shortcuts(app: &AppHandle) -> Result<(), String> {
    let capture_app = app.clone();
    app.global_shortcut()
        .on_shortcut("CommandOrControl+Shift+Space", move |_, _, event| {
            if event.state == ShortcutState::Pressed {
                let _ = show_capture_window(&capture_app);
            }
        })
        .map_err(|err| err.to_string())?;

    Ok(())
}

fn ensure_capture_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    if let Some(window) = app.get_webview_window(CAPTURE_WINDOW_LABEL) {
        return Ok(window);
    }

    let window = WebviewWindowBuilder::new(app, CAPTURE_WINDOW_LABEL, WebviewUrl::App("/capture".into()))
        .title("Quick Capture")
        .decorations(false)
        .resizable(false)
        .transparent(true)
        .skip_taskbar(true)
        .visible(false)
        .inner_size(600.0, 240.0)
        .build()
        .map_err(|err| err.to_string())?;

    let hidden_window = window.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            let _ = hidden_window.hide();
        }
    });

    Ok(window)
}

pub fn show_capture_window(app: &AppHandle) -> Result<(), String> {
    let window = ensure_capture_window(app)?;
    let _ = window.center();
    window.show().map_err(|err| err.to_string())?;
    window.set_focus().map_err(|err| err.to_string())?;
    Ok(())
}