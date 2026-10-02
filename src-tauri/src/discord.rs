use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};

use crate::model::{FlightState, Settings};

pub struct DiscordPresenceService {
    client: Option<DiscordIpcClient>,
    client_id: String,
}

impl DiscordPresenceService {
    pub fn new() -> Self {
        Self {
            client: None,
            client_id: String::new(),
        }
    }

    pub fn clear(&mut self) {
        if let Some(mut client) = self.client.take() {
            let _ = client.clear_activity();
            let _ = client.close();
        }
    }

    pub fn update(&mut self, settings: &Settings, flight: Option<&FlightState>) -> String {
        if !settings.enabled || flight.is_none() {
            self.clear();
            return if settings.enabled { "Idle" } else { "Paused" }.into();
        }
        let custom_id = settings.discord_application_id.trim();
        let id = if custom_id.is_empty() {
            crate::model::DEFAULT_DISCORD_APPLICATION_ID
        } else {
            custom_id
        };
        if id.is_empty() {
            self.clear();
            return "Add Discord application ID".into();
        }
        if self.client_id != id {
            self.clear();
            self.client_id = id.into();
        }
        if self.client.is_none() {
            let mut client = DiscordIpcClient::new(id);
            if client.connect().is_err() {
                return "Discord unavailable".into();
            }
            self.client = Some(client);
        }
        let flight = flight.expect("checked above");
        let details = render_template(&settings.details_template, flight, settings);
        let state = render_template(&settings.state_template, flight, settings);
        let fallback_details = if let Some(cs) = &flight.callsign {
            let cs = cs.trim();
            if !cs.is_empty() {
                format!("Flying as {cs} on VATSIM")
            } else {
                "Flying on VATSIM".into()
            }
        } else {
            "Flying on VATSIM".into()
        };
        let mut activity = activity::Activity::new()
            .details(if details.is_empty() {
                &fallback_details
            } else {
                &details
            })
            .state(if state.is_empty() {
                "In flight"
            } else {
                &state
            });
        match settings.time_mode.as_str() {
            "elapsed" => {
                let now = chrono::Utc::now().timestamp();
                let start = flight.start_time.unwrap_or_else(|| {
                    flight.elapsed_time.map(|e| now - e).unwrap_or(now)
                });
                activity = activity.timestamps(activity::Timestamps::new().start(start));
            }
            "none" | "off" => {
                // Timestamps disabled
            }
            _ => {
                // Default: "remaining" (countdown)
                if let Some(seconds) = flight.time_remaining.filter(|seconds| *seconds > 0) {
                    activity = activity.timestamps(
                        activity::Timestamps::new().end(chrono::Utc::now().timestamp() + seconds),
                    );
                }
            }
        }
        let map_url = get_vatsim_map_url(flight, settings);
        let button_label = if let Some(callsign) = &flight.callsign {
            let cs = callsign.trim();
            if !cs.is_empty() {
                format!("Track {cs} on Map")
            } else {
                "View VATSIM Map".into()
            }
        } else {
            "View VATSIM Map".into()
        };
        let buttons = vec![
            activity::Button::new(&button_label, &map_url),
            activity::Button::new(
                "Download SkyStats",
                "https://github.com/yani2173/SkyStats/releases",
            ),
        ];
        activity = activity.buttons(buttons);

        let large_hover = flight
            .callsign
            .as_deref()
            .map(|cs| format!("Flying as {cs} on VATSIM"))
            .unwrap_or_else(|| "SkyStats - VATSIM Flight Presence".into());
        let mut assets = activity::Assets::new()
            .large_image("logo")
            .large_text(&large_hover);
        if let Some((sim_key, sim_text)) = resolve_simulator(&settings.simulator) {
            assets = assets.small_image(sim_key).small_text(sim_text);
        }
        activity = activity.assets(assets);
        match self
            .client
            .as_mut()
            .expect("created above")
            .set_activity(activity)
        {
            Ok(_) => "Connected".into(),
            Err(_) => {
                self.client.take();
                "Discord unavailable".into()
            }
        }
    }
}

struct RegionBound {
    name: &'static str,
    min_lat: f64,
    max_lat: f64,
    min_lon: f64,
    max_lon: f64,
}

const REGIONS: &[RegionBound] = &[
    // Micro-states & small islands (must be matched before surrounding nations)
    RegionBound { name: "Monaco", min_lat: 43.72, max_lat: 43.76, min_lon: 7.41, max_lon: 7.44 },
    RegionBound { name: "Gibraltar", min_lat: 36.10, max_lat: 36.16, min_lon: -5.37, max_lon: -5.33 },
    RegionBound { name: "San Marino", min_lat: 43.90, max_lat: 43.98, min_lon: 12.42, max_lon: 12.52 },
    RegionBound { name: "Liechtenstein", min_lat: 47.05, max_lat: 47.27, min_lon: 9.47, max_lon: 9.64 },
    RegionBound { name: "Andorra", min_lat: 42.42, max_lat: 42.66, min_lon: 1.41, max_lon: 1.79 },
    RegionBound { name: "Singapore", min_lat: 1.20, max_lat: 1.48, min_lon: 103.60, max_lon: 104.05 },
    RegionBound { name: "Bahrain", min_lat: 25.80, max_lat: 26.35, min_lon: 50.40, max_lon: 50.75 },
    RegionBound { name: "Malta", min_lat: 35.75, max_lat: 36.10, min_lon: 14.15, max_lon: 14.60 },
    RegionBound { name: "Qatar", min_lat: 24.50, max_lat: 26.20, min_lon: 50.70, max_lon: 51.70 },
    RegionBound { name: "Luxembourg", min_lat: 49.44, max_lat: 50.18, min_lon: 5.73, max_lon: 6.53 },
    RegionBound { name: "Hong Kong", min_lat: 22.15, max_lat: 22.58, min_lon: 113.80, max_lon: 114.45 },
    RegionBound { name: "Lebanon", min_lat: 33.05, max_lat: 34.70, min_lon: 35.10, max_lon: 36.65 },
    RegionBound { name: "Cyprus", min_lat: 34.57, max_lat: 35.70, min_lon: 32.27, max_lon: 34.60 },
    RegionBound { name: "Kuwait", min_lat: 28.50, max_lat: 30.10, min_lon: 46.50, max_lon: 48.50 },
    RegionBound { name: "Israel", min_lat: 29.45, max_lat: 33.35, min_lon: 34.25, max_lon: 35.90 },
    RegionBound { name: "Faroe Islands", min_lat: 61.35, max_lat: 62.45, min_lon: -7.75, max_lon: -6.25 },
    RegionBound { name: "the Maldives", min_lat: -0.70, max_lat: 7.20, min_lon: 72.50, max_lon: 73.80 },
    RegionBound { name: "Jamaica", min_lat: 17.70, max_lat: 18.60, min_lon: -78.40, max_lon: -76.20 },
    RegionBound { name: "Puerto Rico", min_lat: 17.85, max_lat: 18.55, min_lon: -67.30, max_lon: -65.20 },
    RegionBound { name: "the Bahamas", min_lat: 20.80, max_lat: 27.30, min_lon: -79.30, max_lon: -72.70 },

    // European Nations
    RegionBound { name: "Switzerland", min_lat: 45.81, max_lat: 47.81, min_lon: 5.95, max_lon: 10.50 },
    RegionBound { name: "Belgium", min_lat: 49.49, max_lat: 51.51, min_lon: 2.54, max_lon: 6.41 },
    RegionBound { name: "Netherlands", min_lat: 50.75, max_lat: 53.55, min_lon: 3.36, max_lon: 7.23 },
    RegionBound { name: "Slovenia", min_lat: 45.42, max_lat: 46.88, min_lon: 13.38, max_lon: 16.61 },
    RegionBound { name: "Austria", min_lat: 46.37, max_lat: 49.02, min_lon: 9.53, max_lon: 17.16 },
    RegionBound { name: "Czechia", min_lat: 48.55, max_lat: 51.06, min_lon: 12.09, max_lon: 18.86 },
    RegionBound { name: "Slovakia", min_lat: 47.73, max_lat: 49.61, min_lon: 16.83, max_lon: 22.57 },
    RegionBound { name: "Hungary", min_lat: 45.74, max_lat: 48.58, min_lon: 16.11, max_lon: 22.90 },
    RegionBound { name: "Croatia", min_lat: 42.39, max_lat: 46.55, min_lon: 13.49, max_lon: 19.45 },
    RegionBound { name: "Bosnia & Herzegovina", min_lat: 42.55, max_lat: 45.28, min_lon: 15.72, max_lon: 19.63 },
    RegionBound { name: "Serbia", min_lat: 42.24, max_lat: 46.19, min_lon: 18.84, max_lon: 23.01 },
    RegionBound { name: "Montenegro", min_lat: 41.85, max_lat: 43.55, min_lon: 18.42, max_lon: 20.35 },
    RegionBound { name: "Kosovo", min_lat: 41.85, max_lat: 43.27, min_lon: 20.01, max_lon: 21.80 },
    RegionBound { name: "North Macedonia", min_lat: 40.85, max_lat: 42.36, min_lon: 20.45, max_lon: 23.04 },
    RegionBound { name: "Albania", min_lat: 39.64, max_lat: 42.66, min_lon: 19.26, max_lon: 21.06 },
    RegionBound { name: "Bulgaria", min_lat: 41.23, max_lat: 44.22, min_lon: 22.35, max_lon: 28.61 },
    RegionBound { name: "Romania", min_lat: 43.62, max_lat: 48.27, min_lon: 20.26, max_lon: 29.71 },
    RegionBound { name: "Moldova", min_lat: 45.45, max_lat: 48.50, min_lon: 26.60, max_lon: 30.20 },
    RegionBound { name: "Greece", min_lat: 34.80, max_lat: 41.75, min_lon: 19.37, max_lon: 28.25 },
    RegionBound { name: "Estonia", min_lat: 57.50, max_lat: 59.70, min_lon: 21.75, max_lon: 28.20 },
    RegionBound { name: "Latvia", min_lat: 55.65, max_lat: 58.10, min_lon: 20.95, max_lon: 28.25 },
    RegionBound { name: "Lithuania", min_lat: 53.85, max_lat: 56.45, min_lon: 20.95, max_lon: 26.85 },
    RegionBound { name: "Poland", min_lat: 49.00, max_lat: 54.84, min_lon: 14.12, max_lon: 24.15 },
    RegionBound { name: "Germany", min_lat: 47.27, max_lat: 55.06, min_lon: 5.87, max_lon: 15.04 },
    RegionBound { name: "Denmark", min_lat: 54.55, max_lat: 57.75, min_lon: 8.07, max_lon: 12.69 },
    RegionBound { name: "Ireland", min_lat: 51.42, max_lat: 55.44, min_lon: -10.66, max_lon: -5.43 },
    RegionBound { name: "United Kingdom", min_lat: 49.96, max_lat: 58.67, min_lon: -8.65, max_lon: 1.77 },
    RegionBound { name: "France", min_lat: 42.33, max_lat: 51.09, min_lon: -4.79, max_lon: 8.23 },
    RegionBound { name: "Spain", min_lat: 36.00, max_lat: 43.79, min_lon: -9.30, max_lon: 3.33 },
    RegionBound { name: "Portugal", min_lat: 36.96, max_lat: 42.15, min_lon: -9.53, max_lon: -6.19 },
    RegionBound { name: "Italy", min_lat: 36.65, max_lat: 47.09, min_lon: 6.63, max_lon: 18.52 },
    RegionBound { name: "Norway", min_lat: 57.98, max_lat: 71.18, min_lon: 4.64, max_lon: 31.06 },
    RegionBound { name: "Sweden", min_lat: 55.34, max_lat: 69.06, min_lon: 11.03, max_lon: 24.17 },
    RegionBound { name: "Finland", min_lat: 59.73, max_lat: 70.09, min_lon: 20.55, max_lon: 31.59 },
    RegionBound { name: "Iceland", min_lat: 63.30, max_lat: 66.60, min_lon: -24.60, max_lon: -13.50 },
    RegionBound { name: "Ukraine", min_lat: 44.35, max_lat: 52.40, min_lon: 22.15, max_lon: 40.20 },
    RegionBound { name: "Belarus", min_lat: 51.25, max_lat: 56.17, min_lon: 23.18, max_lon: 32.78 },

    // Middle East & Central Asia
    RegionBound { name: "Georgia", min_lat: 41.05, max_lat: 43.60, min_lon: 39.95, max_lon: 46.75 },
    RegionBound { name: "Armenia", min_lat: 38.80, max_lat: 41.30, min_lon: 43.45, max_lon: 46.65 },
    RegionBound { name: "Azerbaijan", min_lat: 38.35, max_lat: 41.90, min_lon: 44.75, max_lon: 50.85 },
    RegionBound { name: "Turkey", min_lat: 35.82, max_lat: 42.10, min_lon: 25.66, max_lon: 44.82 },
    RegionBound { name: "Jordan", min_lat: 29.18, max_lat: 33.37, min_lon: 34.95, max_lon: 39.30 },
    RegionBound { name: "United Arab Emirates", min_lat: 22.63, max_lat: 26.08, min_lon: 51.58, max_lon: 56.38 },
    RegionBound { name: "Oman", min_lat: 16.65, max_lat: 26.40, min_lon: 51.85, max_lon: 59.85 },
    RegionBound { name: "Saudi Arabia", min_lat: 16.35, max_lat: 32.15, min_lon: 34.50, max_lon: 55.70 },
    RegionBound { name: "Iraq", min_lat: 29.05, max_lat: 37.38, min_lon: 38.75, max_lon: 48.60 },
    RegionBound { name: "Iran", min_lat: 25.05, max_lat: 39.78, min_lon: 44.05, max_lon: 63.35 },
    RegionBound { name: "Kazakhstan", min_lat: 40.56, max_lat: 55.43, min_lon: 46.49, max_lon: 87.31 },
    RegionBound { name: "Uzbekistan", min_lat: 37.18, max_lat: 45.57, min_lon: 56.00, max_lon: 73.15 },

    // Asia & Pacific
    RegionBound { name: "Taiwan", min_lat: 21.85, max_lat: 25.30, min_lon: 119.95, max_lon: 122.10 },
    RegionBound { name: "South Korea", min_lat: 34.25, max_lat: 38.60, min_lon: 126.05, max_lon: 129.60 },
    RegionBound { name: "Japan", min_lat: 30.98, max_lat: 45.52, min_lon: 129.54, max_lon: 145.82 },
    RegionBound { name: "Thailand", min_lat: 5.60, max_lat: 20.45, min_lon: 97.35, max_lon: 105.65 },
    RegionBound { name: "Vietnam", min_lat: 8.35, max_lat: 23.40, min_lon: 102.15, max_lon: 109.50 },
    RegionBound { name: "Malaysia", min_lat: 0.85, max_lat: 7.40, min_lon: 99.60, max_lon: 119.30 },
    RegionBound { name: "the Philippines", min_lat: 4.65, max_lat: 21.15, min_lon: 116.90, max_lon: 126.60 },
    RegionBound { name: "Indonesia", min_lat: -11.00, max_lat: 6.00, min_lon: 95.00, max_lon: 141.00 },
    RegionBound { name: "Pakistan", min_lat: 23.65, max_lat: 37.10, min_lon: 60.85, max_lon: 77.85 },
    RegionBound { name: "India", min_lat: 8.05, max_lat: 35.50, min_lon: 68.10, max_lon: 97.40 },
    RegionBound { name: "Bangladesh", min_lat: 20.74, max_lat: 26.63, min_lon: 88.01, max_lon: 92.67 },
    RegionBound { name: "Sri Lanka", min_lat: 5.92, max_lat: 9.84, min_lon: 79.69, max_lon: 81.88 },
    RegionBound { name: "Nepal", min_lat: 26.35, max_lat: 30.45, min_lon: 80.06, max_lon: 88.20 },
    RegionBound { name: "China", min_lat: 18.15, max_lat: 53.55, min_lon: 73.50, max_lon: 134.80 },
    RegionBound { name: "Australia", min_lat: -43.63, max_lat: -10.69, min_lon: 113.34, max_lon: 153.57 },
    RegionBound { name: "New Zealand", min_lat: -47.30, max_lat: -34.40, min_lon: 166.45, max_lon: 178.60 },

    // Americas
    RegionBound { name: "Panama", min_lat: 7.20, max_lat: 9.65, min_lon: -83.05, max_lon: -77.15 },
    RegionBound { name: "Costa Rica", min_lat: 8.05, max_lat: 11.20, min_lon: -85.95, max_lon: -82.55 },
    RegionBound { name: "the Dominican Republic", min_lat: 17.55, max_lat: 19.95, min_lon: -72.00, max_lon: -68.30 },
    RegionBound { name: "Cuba", min_lat: 19.80, max_lat: 23.30, min_lon: -84.95, max_lon: -74.15 },
    RegionBound { name: "Mexico", min_lat: 14.53, max_lat: 32.72, min_lon: -117.13, max_lon: -86.71 },
    RegionBound { name: "the United States", min_lat: 24.52, max_lat: 49.38, min_lon: -125.00, max_lon: -66.93 },
    RegionBound { name: "Canada", min_lat: 41.68, max_lat: 70.00, min_lon: -141.00, max_lon: -52.62 },
    RegionBound { name: "Colombia", min_lat: -4.25, max_lat: 12.50, min_lon: -79.05, max_lon: -66.85 },
    RegionBound { name: "Venezuela", min_lat: 0.65, max_lat: 12.20, min_lon: -73.38, max_lon: -59.80 },
    RegionBound { name: "Ecuador", min_lat: -5.02, max_lat: 1.45, min_lon: -81.08, max_lon: -75.19 },
    RegionBound { name: "Peru", min_lat: -18.35, max_lat: -0.05, min_lon: -81.35, max_lon: -68.65 },
    RegionBound { name: "Bolivia", min_lat: -22.90, max_lat: -9.68, min_lon: -69.64, max_lon: -57.45 },
    RegionBound { name: "Chile", min_lat: -55.90, max_lat: -17.50, min_lon: -75.65, max_lon: -66.95 },
    RegionBound { name: "Argentina", min_lat: -55.10, max_lat: -21.80, min_lon: -73.60, max_lon: -53.60 },
    RegionBound { name: "Paraguay", min_lat: -27.60, max_lat: -19.30, min_lon: -62.65, max_lon: -54.25 },
    RegionBound { name: "Uruguay", min_lat: -35.02, max_lat: -30.08, min_lon: -58.44, max_lon: -53.09 },
    RegionBound { name: "Brazil", min_lat: -33.75, max_lat: 5.25, min_lon: -73.95, max_lon: -34.80 },

    // Africa
    RegionBound { name: "Tunisia", min_lat: 30.25, max_lat: 37.55, min_lon: 7.50, max_lon: 11.60 },
    RegionBound { name: "Morocco", min_lat: 27.65, max_lat: 35.95, min_lon: -13.15, max_lon: -1.05 },
    RegionBound { name: "Egypt", min_lat: 22.00, max_lat: 31.67, min_lon: 25.00, max_lon: 36.90 },
    RegionBound { name: "Algeria", min_lat: 19.00, max_lat: 37.10, min_lon: -8.70, max_lon: 12.00 },
    RegionBound { name: "South Africa", min_lat: -34.85, max_lat: -22.15, min_lon: 16.45, max_lon: 32.90 },
    RegionBound { name: "Kenya", min_lat: -4.70, max_lat: 5.45, min_lon: 33.90, max_lon: 41.90 },
    RegionBound { name: "Ethiopia", min_lat: 3.40, max_lat: 14.89, min_lon: 32.99, max_lon: 47.99 },
    RegionBound { name: "Tanzania", min_lat: -11.75, max_lat: -0.98, min_lon: 29.30, max_lon: 40.45 },
    RegionBound { name: "Nigeria", min_lat: 4.25, max_lat: 13.90, min_lon: 2.65, max_lon: 14.70 },
    RegionBound { name: "Ghana", min_lat: 4.74, max_lat: 11.17, min_lon: -3.26, max_lon: 1.20 },

    // Specific Coastal Seas & Straits (matched when not over land)
    RegionBound { name: "the English Channel", min_lat: 49.20, max_lat: 51.20, min_lon: -4.50, max_lon: 1.80 },
    RegionBound { name: "the Bay of Biscay", min_lat: 43.50, max_lat: 48.50, min_lon: -9.50, max_lon: -1.50 },
    RegionBound { name: "the Irish Sea", min_lat: 52.00, max_lat: 55.00, min_lon: -6.50, max_lon: -3.00 },
    RegionBound { name: "the Celtic Sea", min_lat: 49.00, max_lat: 52.00, min_lon: -11.00, max_lon: -5.00 },
    RegionBound { name: "the North Sea", min_lat: 51.50, max_lat: 61.50, min_lon: -2.00, max_lon: 8.50 },
    RegionBound { name: "the Adriatic Sea", min_lat: 40.50, max_lat: 45.80, min_lon: 12.00, max_lon: 19.50 },
    RegionBound { name: "the Ionian Sea", min_lat: 35.50, max_lat: 40.50, min_lon: 15.00, max_lon: 21.50 },
    RegionBound { name: "the Aegean Sea", min_lat: 35.00, max_lat: 41.00, min_lon: 22.50, max_lon: 28.00 },
    RegionBound { name: "the Tyrrhenian Sea", min_lat: 38.00, max_lat: 44.00, min_lon: 9.50, max_lon: 16.00 },
    RegionBound { name: "the Persian Gulf", min_lat: 23.50, max_lat: 30.50, min_lon: 48.00, max_lon: 56.50 },
    RegionBound { name: "the Red Sea", min_lat: 12.50, max_lat: 28.50, min_lon: 32.50, max_lon: 43.50 },
    RegionBound { name: "the Gulf of Mexico", min_lat: 18.00, max_lat: 30.50, min_lon: -98.00, max_lon: -80.00 },

    // Major Broad Seas & Oceans
    RegionBound { name: "the Baltic Sea", min_lat: 53.50, max_lat: 65.50, min_lon: 10.00, max_lon: 30.00 },
    RegionBound { name: "the Black Sea", min_lat: 40.90, max_lat: 46.60, min_lon: 27.50, max_lon: 41.80 },
    RegionBound { name: "the Mediterranean Sea", min_lat: 30.00, max_lat: 45.00, min_lon: -5.00, max_lon: 36.00 },
    RegionBound { name: "the Caribbean Sea", min_lat: 9.00, max_lat: 22.00, min_lon: -88.00, max_lon: -60.00 },
    RegionBound { name: "the Arabian Sea", min_lat: 10.00, max_lat: 25.00, min_lon: 55.00, max_lon: 75.00 },
    RegionBound { name: "the Bay of Bengal", min_lat: 5.00, max_lat: 22.00, min_lon: 80.00, max_lon: 95.00 },
    RegionBound { name: "the South China Sea", min_lat: 3.00, max_lat: 22.00, min_lon: 105.00, max_lon: 120.00 },
    RegionBound { name: "the Sea of Japan", min_lat: 35.00, max_lat: 52.00, min_lon: 128.00, max_lon: 142.00 },
    RegionBound { name: "the Norwegian Sea", min_lat: 62.00, max_lat: 72.00, min_lon: -5.00, max_lon: 15.00 },
    RegionBound { name: "the Coral Sea", min_lat: -28.00, max_lat: -10.00, min_lon: 145.00, max_lon: 165.00 },
    RegionBound { name: "the Tasman Sea", min_lat: -48.00, max_lat: -28.00, min_lon: 150.00, max_lon: 172.00 },
    RegionBound { name: "the Indian Ocean", min_lat: -60.00, max_lat: 12.00, min_lon: 35.00, max_lon: 115.00 },
    RegionBound { name: "the North Atlantic", min_lat: 20.00, max_lat: 65.00, min_lon: -60.00, max_lon: -10.00 },
    RegionBound { name: "the South Atlantic", min_lat: -60.00, max_lat: 0.00, min_lon: -50.00, max_lon: 15.00 },
    RegionBound { name: "the North Pacific", min_lat: 10.00, max_lat: 60.00, min_lon: 140.00, max_lon: -125.00 },
    RegionBound { name: "the South Pacific", min_lat: -60.00, max_lat: 0.00, min_lon: 150.00, max_lon: -70.00 },
];

pub fn get_country(lat: Option<f64>, lon: Option<f64>) -> Option<&'static str> {
    let (lat, lon) = (lat?, lon?);
    for r in REGIONS {
        if lat >= r.min_lat && lat <= r.max_lat && lon >= r.min_lon && lon <= r.max_lon {
            return Some(r.name);
        }
    }
    None
}

pub fn get_flying_over(lat: Option<f64>, lon: Option<f64>) -> Option<String> {
    get_country(lat, lon).map(|c| format!("Flying over {c}"))
}

pub const MSFS_2024_ICON: &str =
    "https://avatars.fastly.steamstatic.com/c9ebab515478518e77471cc69187426cb7321723_full.jpg";
pub const MSFS_2020_ICON: &str =
    "https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/1250410/e374de450803dc212690bf721a14843a0dd2ad58.jpg";
pub const XPLANE_ICON: &str =
    "https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/2014780/378349d4237e5f700f5e851d5821b29fb58bd9d3.jpg";

pub fn resolve_simulator(setting: &str) -> Option<(&'static str, &'static str)> {
    match setting {
        "msfs2024" => Some((MSFS_2024_ICON, "Microsoft Flight Simulator 2024")),
        "msfs2020" => Some((MSFS_2020_ICON, "Microsoft Flight Simulator 2020")),
        "xplane" => Some((XPLANE_ICON, "X-Plane")),
        "none" => None,
        _ => {
            #[cfg(target_os = "windows")]
            {
                use std::os::windows::process::CommandExt;
                const CREATE_NO_WINDOW: u32 = 0x08000000;
                if let Ok(output) = std::process::Command::new("tasklist")
                    .args(["/NH", "/FO", "CSV"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .output()
                {
                    let list = String::from_utf8_lossy(&output.stdout).to_lowercase();
                    if list.contains("flightsimulator2024.exe") {
                        return Some((MSFS_2024_ICON, "Microsoft Flight Simulator 2024"));
                    }
                    if list.contains("flightsimulator.exe") {
                        return Some((MSFS_2020_ICON, "Microsoft Flight Simulator 2020"));
                    }
                    if list.contains("x-plane.exe") {
                        return Some((XPLANE_ICON, "X-Plane"));
                    }
                }
            }
            Some((MSFS_2024_ICON, "Microsoft Flight Simulator 2024"))
        }
    }
}

pub fn format_airport_display(
    code: Option<&str>,
    name: Option<&str>,
    format: &str,
) -> Option<String> {
    let code = code?.trim();
    if code.is_empty() {
        return None;
    }
    let name = name.map(str::trim).filter(|n| !n.is_empty());
    match format {
        "both" => {
            if let Some(n) = name {
                Some(format!("{code} ({n})"))
            } else {
                Some(code.to_string())
            }
        }
        "icao" => Some(code.to_string()),
        _ => {
            if let Some(n) = name {
                Some(n.to_string())
            } else {
                Some(code.to_string())
            }
        }
    }
}

pub const SAFE_APPROACH_TEMPLATES: &[&str] = &[
    "On Approach to {airport}",
    "On Final for {airport}",
    "Landing at {airport}",
    "Inbound to {airport}",
    "Arriving at {airport}",
    "Descending into {airport}",
];

pub fn resolve_safe_approach_template(raw: &str) -> &'static str {
    let trimmed = raw.trim();
    for &safe in SAFE_APPROACH_TEMPLATES {
        if trimmed == safe {
            return safe;
        }
    }
    "On Approach to {airport}"
}

pub fn get_smart_status(flight: &FlightState, settings: &Settings) -> String {
    let country = get_country(flight.latitude, flight.longitude);
    let fl = flight.altitude.map(|n| format!("FL{:03}", (n as f64 / 100.0).round() as i32));
    let phase = flight.phase.to_lowercase();

    let arr_name = flight
        .arrival_name
        .as_deref()
        .or_else(|| flight.arrival.as_deref().and_then(crate::flight_math::get_airport_name));
    let arr_display =
        format_airport_display(flight.arrival.as_deref(), arr_name, &settings.airport_format);

    let dep_name = flight
        .departure_name
        .as_deref()
        .or_else(|| flight.departure.as_deref().and_then(crate::flight_math::get_airport_name));
    let dep_display =
        format_airport_display(flight.departure.as_deref(), dep_name, &settings.airport_format);

    // Post-flight ground states (use arrival airport)
    if phase.contains("arrived at gate") {
        return if let Some(ref target) = arr_display {
            format!("Arrived at {target}")
        } else {
            "Arrived at Gate".into()
        };
    }
    if phase.contains("taxiing to gate") {
        return if let Some(ref target) = arr_display {
            format!("Taxiing to Gate at {target}")
        } else {
            "Taxiing to Gate".into()
        };
    }
    if phase.contains("landed") {
        return if let Some(ref target) = arr_display {
            format!("Landed at {target}")
        } else {
            "Safely Landed".into()
        };
    }

    // Approach and final approach
    if phase.contains("short final") {
        return if let Some(ref target) = arr_display {
            format!("On Short Final for {target}")
        } else {
            "On Short Final".into()
        };
    }
    if phase.contains("final approach") {
        return if let Some(ref target) = arr_display {
            let template = if settings.approach_template.trim().is_empty()
                || settings.approach_template.trim() == "On Approach to {airport}"
            {
                "On Final for {airport}"
            } else {
                resolve_safe_approach_template(&settings.approach_template)
            };
            template
                .replace("{airport}", target)
                .replace("{city}", target)
                .replace("{target}", target)
        } else {
            "On Final Approach".into()
        };
    }
    if phase.contains("approach") {
        return if let Some(ref target) = arr_display {
            let template = resolve_safe_approach_template(&settings.approach_template);
            template
                .replace("{airport}", target)
                .replace("{city}", target)
                .replace("{target}", target)
        } else {
            "On Approach".into()
        };
    }
    // Go-around
    if phase.contains("go-around") {
        return if let Some(ref target) = arr_display {
            format!("Go-Around at {target}")
        } else {
            "Go-Around".into()
        };
    }
    // Descent
    if phase.contains("descent") || phase.contains("descending") {
        if flight.distance_remaining.is_some_and(|d| d < 85.0) {
            if let Some(ref target) = arr_display {
                return if let Some(f) = fl {
                    format!("Descending into {target} - {f}")
                } else {
                    format!("Descending into {target}")
                };
            }
        }
        if let Some(c) = country {
            return if let Some(f) = fl {
                format!("Descending over {c} - {f}")
            } else {
                format!("Descending over {c}")
            };
        }
        if let Some(ref target) = arr_display {
            return if let Some(f) = fl {
                format!("Descending into {target} - {f}")
            } else {
                format!("Descending into {target}")
            };
        }
        return if let Some(f) = fl {
            format!("Descending - {f}")
        } else {
            "Descending".into()
        };
    }
    // Pre-flight ground states (use departure airport)
    if phase.contains("takeoff roll") {
        return if let Some(ref origin) = dep_display {
            format!("Takeoff Roll at {origin}")
        } else {
            "Takeoff Roll".into()
        };
    }
    if phase.contains("departing") {
        return if let Some(ref origin) = dep_display {
            format!("Departing {origin}")
        } else {
            "Departing".into()
        };
    }
    if phase.contains("on gate") {
        return if let Some(ref origin) = dep_display {
            format!("At Gate - {origin}")
        } else {
            "At Gate".into()
        };
    }
    if phase.contains("climb") {
        if flight.distance_departure.is_some_and(|d| d < 45.0) {
            if let Some(ref origin) = dep_display {
                return if let Some(f) = fl {
                    format!("Climbing out of {origin} - Passing {f}")
                } else {
                    format!("Climbing out of {origin}")
                };
            }
        }
        if let Some(c) = country {
            return if let Some(f) = fl {
                format!("Climbing over {c} - Passing {f}")
            } else {
                format!("Climbing over {c}")
            };
        }
        if let Some(ref origin) = dep_display {
            return if let Some(f) = fl {
                format!("Climbing out of {origin} - Passing {f}")
            } else {
                format!("Climbing out of {origin}")
            };
        }
        return if let Some(f) = fl {
            format!("Climbing - Passing {f}")
        } else {
            "Climbing".into()
        };
    }
    if phase.contains("cruise") || phase.contains("cruising") || phase.contains("en route") {
        if let Some(c) = country {
            let verb = if c.starts_with("the ") { "Crossing" } else { "Cruising over" };
            return if let Some(f) = fl {
                format!("{verb} {c} at {f}")
            } else {
                format!("{verb} {c}")
            };
        }
        if let Some(ref target) = arr_display {
            return if let Some(f) = fl {
                format!("En route to {target} at {f}")
            } else {
                format!("En route to {target}")
            };
        }
        return if let Some(f) = fl {
            format!("Cruising at {f}")
        } else {
            "En route".into()
        };
    }
    // Generic pre-flight taxi (catches "Taxiing" but not "Taxiing to Gate" which is handled above)
    if phase.contains("taxi") || phase.contains("preflight") || phase.contains("boarding") || phase.contains("pushing back") {
        if let Some(ref origin) = dep_display {
            return format!("Taxiing at {origin}");
        }
        return "Preparing for Departure".into();
    }
    if let Some(c) = country {
        let verb = if c.starts_with("the ") { "Crossing" } else { "Flying over" };
        if let Some(f) = fl {
            return format!("{verb} {c} at {f}");
        }
        return format!("{verb} {c}");
    }
    if let Some(ref target) = arr_display {
        if let Some(f) = fl {
            return format!("In Flight to {target} at {f}");
        }
    }
    if let Some(f) = fl {
        format!("In Flight at {f}")
    } else {
        "In Flight".into()
    }
}

pub const ALLOWED_TEMPLATE_TOKENS: &[&str] = &[
    "callsign",
    "flying_as",
    "departure",
    "arrival",
    "departure_name",
    "departure_city",
    "arrival_name",
    "arrival_city",
    "approach_target",
    "aircraft",
    "aircraft_name",
    "altitude",
    "flight_level",
    "groundspeed",
    "heading",
    "frequency",
    "controller",
    "distance_remaining",
    "eta",
    "time_remaining",
    "flight_time",
    "phase",
    "route",
    "country",
    "flying_over",
    "smart_status",
    "airspace",
    "network",
];

pub fn sanitize_template(template: &str) -> String {
    let mut result = String::with_capacity(template.len());
    let mut chars = template.chars().peekable();

    while let Some(c) = chars.next() {
        if c == '{' {
            let mut token = String::new();
            let mut closed = false;
            for inner in chars.by_ref() {
                if inner == '}' {
                    closed = true;
                    break;
                }
                token.push(inner);
            }
            if closed {
                let lower = token.trim().to_lowercase();
                if ALLOWED_TEMPLATE_TOKENS.contains(&lower.as_str()) {
                    result.push('{');
                    result.push_str(&lower);
                    result.push('}');
                }
            }
        } else if matches!(c, '•' | '→' | '-' | '–' | '—' | '/' | '|' | ':' | ',' | ' ' | '\t') {
            result.push(c);
        } else if c == 'v' || c == 'V' {
            let mut candidate = Vec::new();
            let expected = ['a', 't', 's', 'i', 'm'];
            let mut matched = true;
            for &exp in &expected {
                if let Some(&next_c) = chars.peek() {
                    if next_c.to_ascii_lowercase() == exp {
                        candidate.push(chars.next().unwrap());
                    } else {
                        matched = false;
                        break;
                    }
                } else {
                    matched = false;
                    break;
                }
            }
            if matched && candidate.len() == 5 {
                result.push_str("VATSIM");
            }
        }
    }
    result
}

pub fn render_template(template: &str, flight: &FlightState, settings: &Settings) -> String {
    let mut result = sanitize_template(template);
    let altitude = flight.altitude.map(|n| format!("{n} ft"));
    let flight_level = flight
        .altitude
        .map(|n| format!("FL{:03}", (n as f64 / 100.0).round() as i32));
    let groundspeed = flight.groundspeed.map(|n| format!("{n} kt"));
    let heading = flight.heading.map(|n| format!("{n}°"));
    let distance = flight.distance_remaining.map(|n| format!("{n:.0} NM"));
    let time_remaining = flight
        .time_remaining
        .map(|n| format!("{}h {}m", n / 3600, (n % 3600) / 60));
    let country = get_country(flight.latitude, flight.longitude);
    let flying_over = get_flying_over(flight.latitude, flight.longitude);
    let smart_status = get_smart_status(flight, settings);
    let airspace = country.map(|c| format!("{c} Airspace"));
    let dep_name = flight
        .departure_name
        .as_deref()
        .or_else(|| flight.departure.as_deref().and_then(crate::flight_math::get_airport_name));
    let arr_name = flight
        .arrival_name
        .as_deref()
        .or_else(|| flight.arrival.as_deref().and_then(crate::flight_math::get_airport_name));
    let arr_display =
        format_airport_display(flight.arrival.as_deref(), arr_name, &settings.airport_format);
    let flight_time = flight
        .elapsed_time
        .map(|n| format!("{}h {}m", n / 3600, (n % 3600) / 60));
    let flying_as = flight
        .callsign
        .as_deref()
        .map(|cs| format!("Flying as {cs} on VATSIM"));
    let values = [
        ("callsign", flight.callsign.as_deref()),
        ("flying_as", flying_as.as_deref()),
        ("departure", flight.departure.as_deref()),
        ("arrival", flight.arrival.as_deref()),
        ("departure_name", dep_name),
        ("departure_city", dep_name),
        ("arrival_name", arr_name),
        ("arrival_city", arr_name),
        ("approach_target", arr_display.as_deref()),
        ("aircraft", flight.aircraft.as_deref()),
        ("aircraft_name", flight.aircraft.as_deref()),
        ("altitude", altitude.as_deref()),
        ("flight_level", flight_level.as_deref()),
        ("groundspeed", groundspeed.as_deref()),
        ("heading", heading.as_deref()),
        ("frequency", flight.frequency.as_deref()),
        ("controller", None),
        ("distance_remaining", distance.as_deref()),
        ("eta", flight.eta.as_deref()),
        ("time_remaining", time_remaining.as_deref()),
        ("flight_time", flight_time.as_deref()),
        ("phase", Some(flight.phase.as_str())),
        ("route", flight.route.as_deref()),
        ("country", country),
        ("flying_over", flying_over.as_deref()),
        ("smart_status", Some(smart_status.as_str())),
        ("airspace", airspace.as_deref()),
        ("network", Some("VATSIM")),
    ];
    for (key, value) in values {
        result = result.replace(&format!("{{{key}}}"), value.unwrap_or(""));
    }
    while let Some(start) = result.find('{') {
        if let Some(end) = result[start..].find('}') {
            result.replace_range(start..start + end + 1, "");
        } else {
            break;
        }
    }
    // Collapse dangling separators when a data field is absent.
    result
        .split('•')
        .map(|s| s.trim().trim_matches(|c: char| c.is_whitespace() || c == '→').trim())
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join(" • ")
        .trim_matches(|c: char| c.is_whitespace() || c == '•')
        .trim()
        .to_string()
}

pub fn get_vatsim_map_url(flight: &FlightState, settings: &Settings) -> String {
    let cid = flight.cid.or_else(|| {
        let trimmed = settings.cid.trim();
        if !trimmed.is_empty() {
            trimmed.parse::<u32>().ok()
        } else {
            None
        }
    });

    if let Some(cid) = cid {
        format!("https://vatsim.privatesearch.xyz/pilot/{cid}")
    } else if let Some(callsign) = &flight.callsign {
        let callsign = callsign.trim();
        if !callsign.is_empty() {
            format!("https://vatsim.privatesearch.xyz/data/flights/{callsign}")
        } else {
            "https://vatsim.privatesearch.xyz/".into()
        }
    } else {
        "https://vatsim.privatesearch.xyz/".into()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn removes_missing_values_and_separators() {
        let flight = FlightState {
            callsign: Some("RYR8AB".into()),
            aircraft: Some("B738".into()),
            ..FlightState::default()
        };
        assert_eq!(
            render_template(
                "{callsign} • {aircraft} • {flight_level}",
                &flight,
                &Settings::default()
            ),
            "RYR8AB • B738"
        );
    }


    #[test]
    fn direct_vatsim_map_urls() {
        let flight_with_cid = FlightState {
            cid: Some(1234567),
            callsign: Some("RYR8AB".into()),
            ..FlightState::default()
        };
        let settings = Settings::default();
        assert_eq!(
            get_vatsim_map_url(&flight_with_cid, &settings),
            "https://vatsim.privatesearch.xyz/pilot/1234567"
        );

        let flight_without_cid = FlightState {
            cid: None,
            callsign: Some("AFR123".into()),
            ..FlightState::default()
        };
        let settings_with_cid = Settings {
            cid: "7654321".into(),
            ..Settings::default()
        };
        assert_eq!(
            get_vatsim_map_url(&flight_without_cid, &settings_with_cid),
            "https://vatsim.privatesearch.xyz/pilot/7654321"
        );

        let flight_only_callsign = FlightState {
            cid: None,
            callsign: Some("DLH456".into()),
            ..FlightState::default()
        };
        assert_eq!(
            get_vatsim_map_url(&flight_only_callsign, &settings),
            "https://vatsim.privatesearch.xyz/data/flights/DLH456"
        );

        let empty_flight = FlightState::default();
        assert_eq!(
            get_vatsim_map_url(&empty_flight, &settings),
            "https://vatsim.privatesearch.xyz/"
        );
    }

    #[test]
    fn smart_mode_approach_shows_city_and_custom_format() {
        let flight = FlightState {
            callsign: Some("UKA509".into()),
            arrival: Some("EGPF".into()),
            arrival_name: Some("Glasgow".into()),
            phase: "Approach".into(),
            ..FlightState::default()
        };
        let default_settings = Settings::default();
        assert_eq!(
            get_smart_status(&flight, &default_settings),
            "On Approach to Glasgow"
        );

        let both_settings = Settings {
            airport_format: "both".into(),
            ..Settings::default()
        };
        assert_eq!(
            get_smart_status(&flight, &both_settings),
            "On Approach to EGPF (Glasgow)"
        );

        let custom_template = Settings {
            approach_template: "Landing at {airport}".into(),
            ..Settings::default()
        };
        assert_eq!(
            get_smart_status(&flight, &custom_template),
            "Landing at Glasgow"
        );

        let render_res = render_template("{smart_status} • {callsign}", &flight, &default_settings);
        assert_eq!(render_res, "On Approach to Glasgow • UKA509");
    }

    #[test]
    fn default_details_template_has_vatsim() {
        let flight = FlightState {
            departure: Some("EGLL".into()),
            arrival: Some("EGBB".into()),
            ..FlightState::default()
        };
        let settings = Settings::default();
        assert_eq!(
            render_template(&settings.details_template, &flight, &settings),
            "EGLL → EGBB • VATSIM"
        );

        let no_airports = FlightState {
            departure: None,
            arrival: None,
            ..FlightState::default()
        };
        assert_eq!(
            render_template(&settings.details_template, &no_airports, &settings),
            "VATSIM"
        );
    }
}

