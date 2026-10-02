use serde::{Deserialize, Serialize};

pub const DEFAULT_DISCORD_APPLICATION_ID: &str = "";

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub setup_complete: bool,
    pub cid: String,
    pub discord_application_id: String,
    pub enabled: bool,
    pub minimize_to_tray: bool,
    pub demo_mode: bool,
    pub theme: String,
    pub preset: String,
    pub details_template: String,
    pub state_template: String,
    pub time_mode: String,
    pub airport_format: String,
    pub approach_template: String,
    pub simulator: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            setup_complete: false,
            cid: String::new(),
            discord_application_id: String::new(),
            enabled: true,
            minimize_to_tray: true,
            demo_mode: false,
            theme: "dark".into(),
            preset: "Standard".into(),
            details_template: "{departure} → {arrival} • VATSIM".into(),
            state_template: "{callsign} • {aircraft} • {flight_level}".into(),
            time_mode: "remaining".into(),
            airport_format: "name".into(),
            approach_template: "On Approach to {airport}".into(),
            simulator: "auto".into(),
        }
    }
}

#[derive(Clone, Debug, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct FlightState {
    pub cid: Option<u32>,
    pub callsign: Option<String>,
    pub departure: Option<String>,
    pub departure_name: Option<String>,
    pub arrival: Option<String>,
    pub arrival_name: Option<String>,
    pub aircraft: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub altitude: Option<i32>,
    pub groundspeed: Option<i32>,
    pub heading: Option<i32>,
    pub route: Option<String>,
    pub frequency: Option<String>,
    pub phase: String,
    pub distance_remaining: Option<f64>,
    pub distance_departure: Option<f64>,
    pub progress: Option<f64>,
    pub time_remaining: Option<i64>,
    pub start_time: Option<i64>,
    pub logon_time: Option<String>,
    pub elapsed_time: Option<i64>,
    pub eta: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSnapshot {
    pub settings: Settings,
    pub flight: Option<FlightState>,
    pub vatsim_status: String,
    pub discord_status: String,
    pub message: String,
    pub last_updated: Option<String>,
}

impl AppSnapshot {
    pub fn new(settings: Settings) -> Self {
        Self {
            settings,
            flight: None,
            vatsim_status: "Waiting".into(),
            discord_status: "Not configured".into(),
            message: "Enter your VATSIM CID to start tracking.".into(),
            last_updated: None,
        }
    }
}
