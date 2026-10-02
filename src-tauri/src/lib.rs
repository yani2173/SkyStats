mod discord;
mod flight_math;
mod model;
mod vatsim;

use std::{
    fs,
    path::PathBuf,
    sync::{mpsc, Arc, Mutex},
    thread,
    time::Duration,
};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, State, WindowEvent,
};

use discord::DiscordPresenceService;
use flight_math::FlightTracker;
use model::{AppSnapshot, Settings};
use vatsim::VatsimService;

struct Shared {
    snapshot: Arc<Mutex<AppSnapshot>>,
    wake: mpsc::Sender<()>,
    settings_path: PathBuf,
}

#[tauri::command]
fn get_snapshot(shared: State<'_, Shared>) -> Result<AppSnapshot, String> {
    shared
        .snapshot
        .lock()
        .map(|s| s.clone())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn save_settings(mut settings: Settings, shared: State<'_, Shared>) -> Result<AppSnapshot, String> {
    settings.details_template = crate::discord::sanitize_template(&settings.details_template);
    settings.state_template = crate::discord::sanitize_template(&settings.state_template);
    settings.approach_template = crate::discord::resolve_safe_approach_template(&settings.approach_template).into();
    validate_settings(&settings)?;
    let content = serde_json::to_vec_pretty(&settings).map_err(|e| e.to_string())?;
    if let Some(dir) = shared.settings_path.parent() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let temporary = shared.settings_path.with_extension("json.tmp");
    fs::write(&temporary, content).map_err(|e| e.to_string())?;
    fs::rename(&temporary, &shared.settings_path).map_err(|e| e.to_string())?;
    let mut snapshot = shared.snapshot.lock().map_err(|e| e.to_string())?;
    if snapshot.settings.cid != settings.cid {
        snapshot.flight = None;
        snapshot.vatsim_status = "Waiting".into();
        snapshot.discord_status = "Updating".into();
    }
    snapshot.settings = settings;
    let result = snapshot.clone();
    drop(snapshot);
    let _ = shared.wake.send(());
    Ok(result)
}

fn validate_settings(settings: &Settings) -> Result<(), String> {
    if !settings.cid.is_empty()
        && (!settings.cid.chars().all(|c| c.is_ascii_digit())
            || settings.cid.parse::<u32>().is_err())
    {
        return Err("VATSIM CID must contain digits only.".into());
    }
    if !settings.discord_application_id.is_empty()
        && (!settings
            .discord_application_id
            .chars()
            .all(|c| c.is_ascii_digit())
            || settings.discord_application_id.len() > 32)
    {
        return Err("Discord application ID must contain digits only.".into());
    }
    if settings.details_template.len() > 128 || settings.state_template.len() > 128 {
        return Err("Presence lines must be at most 128 characters.".into());
    }
    Ok(())
}

fn poll_loop(app: AppHandle, snapshot: Arc<Mutex<AppSnapshot>>, wake: mpsc::Receiver<()>) {
    let vatsim = VatsimService::new();
    let mut discord = DiscordPresenceService::new();
    let mut tracker = FlightTracker::new();
    loop {
        let settings = match snapshot.lock() {
            Ok(s) => s.settings.clone(),
            Err(_) => break,
        };
        let (mut flight, vatsim_status, message) = if settings.cid.is_empty() {
            (
                None,
                "Waiting".into(),
                "Enter your VATSIM CID to start tracking.".into(),
            )
        } else {
            match (&vatsim, settings.cid.parse::<u32>()) {
                (Ok(service), Ok(cid)) => match service.current_flight(cid) {
                    Ok(Some(flight)) => (
                        Some(flight),
                        "Connected".into(),
                        "Live flight found by CID.".into(),
                    ),
                    Ok(None) => (
                        None,
                        "Offline".into(),
                        "No live pilot is connected with this CID.".into(),
                    ),
                    Err(error) => (None, "Unavailable".into(), error),
                },
                (Err(error), _) => (None, "Unavailable".into(), error.clone()),
                _ => (None, "Waiting".into(), "Enter a valid VATSIM CID.".into()),
            }
        };
        if let Some(ref mut live_flight) = flight {
            tracker.update(live_flight, chrono::Utc::now());
        } else {
            tracker = FlightTracker::new();
        }
        let discord_status = discord.update(&settings, flight.as_ref());
        if let Ok(mut state) = snapshot.lock() {
            state.flight = flight;
            state.vatsim_status = vatsim_status;
            state.discord_status = discord_status;
            state.message = message;
            state.last_updated = Some(chrono::Utc::now().to_rfc3339());
            let _ = app.emit("snapshot", state.clone());
        }
        match wake.recv_timeout(Duration::from_secs(20)) {
            Ok(_) | Err(mpsc::RecvTimeoutError::Timeout) => {}
            Err(mpsc::RecvTimeoutError::Disconnected) => break,
        }
    }
    discord.clear();
}

fn open_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let path = app.path().app_config_dir()?.join("settings.json");
            let mut settings = fs::read(&path)
                .ok()
                .and_then(|bytes| serde_json::from_slice::<Settings>(&bytes).ok())
                .filter(|s| validate_settings(s).is_ok())
                .unwrap_or_default();
            if settings.details_template == "{departure} → {arrival}" {
                settings.details_template = "{departure} → {arrival} • VATSIM".into();
            }
            let snapshot = Arc::new(Mutex::new(AppSnapshot::new(settings)));
            let (wake_sender, wake_receiver) = mpsc::channel();
            app.manage(Shared {
                snapshot: snapshot.clone(),
                wake: wake_sender,
                settings_path: path,
            });

            let open = MenuItem::with_id(app, "open", "Open SkyStats", true, None::<&str>)?;
            let flight = MenuItem::with_id(app, "flight", "Current flight", true, None::<&str>)?;
            let pause = MenuItem::with_id(app, "pause", "Pause presence", true, None::<&str>)?;
            let settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &flight, &pause, &settings, &quit])?;
            TrayIconBuilder::new()
                .icon(app.default_window_icon().expect("application icon").clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "open" | "flight" | "settings" => {
                        open_window(app);
                        let _ = app.emit("navigate", event.id().as_ref());
                    }
                    "pause" => {
                        let shared = app.state::<Shared>();
                        if let Ok(mut snapshot) = shared.snapshot.lock() {
                            snapshot.settings.enabled = !snapshot.settings.enabled;
                            let _ = fs::write(
                                &shared.settings_path,
                                serde_json::to_vec_pretty(&snapshot.settings).unwrap_or_default(),
                            );
                        }
                        let _ = shared.wake.send(());
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        open_window(tray.app_handle());
                    }
                })
                .build(app)?;

            let app_handle = app.handle().clone();
            thread::spawn(move || poll_loop(app_handle, snapshot, wake_receiver));
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let shared = window.app_handle().state::<Shared>();
                if shared
                    .snapshot
                    .lock()
                    .map(|s| s.settings.minimize_to_tray)
                    .unwrap_or(false)
                {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![get_snapshot, save_settings])
        .run(tauri::generate_context!())
        .expect("error while running SkyStats");
}
