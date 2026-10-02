use serde::Deserialize;
use std::time::Duration;

use crate::model::FlightState;

const DATA_URL: &str = "https://data.vatsim.net/v3/vatsim-data.json";

#[derive(Deserialize)]
struct Feed {
    pilots: Vec<Pilot>,
}

#[derive(Deserialize)]
struct Pilot {
    cid: u32,
    callsign: String,
    latitude: f64,
    longitude: f64,
    altitude: i32,
    groundspeed: i32,
    heading: i32,
    logon_time: Option<String>,
    flight_plan: Option<FlightPlan>,
}

#[derive(Deserialize)]
struct FlightPlan {
    aircraft_short: Option<String>,
    departure: Option<String>,
    arrival: Option<String>,
    route: Option<String>,
}

pub struct VatsimService {
    client: reqwest::blocking::Client,
}

impl VatsimService {
    pub fn new() -> Result<Self, String> {
        let client = reqwest::blocking::Client::builder()
            .timeout(Duration::from_secs(12))
            .user_agent(concat!("SkyStats/", env!("CARGO_PKG_VERSION")))
            .build()
            .map_err(|e| e.to_string())?;
        Ok(Self { client })
    }

    pub fn current_flight(&self, cid: u32) -> Result<Option<FlightState>, String> {
        let feed: Feed = self
            .client
            .get(DATA_URL)
            .send()
            .and_then(|response| response.error_for_status())
            .map_err(|e| format!("VATSIM feed unavailable: {e}"))?
            .json()
            .map_err(|e| format!("Invalid VATSIM feed: {e}"))?;
        Ok(find_pilot(feed.pilots, cid))
    }
}

fn find_pilot(pilots: Vec<Pilot>, cid: u32) -> Option<FlightState> {
    pilots
        .into_iter()
        .find(|pilot| pilot.cid == cid)
        .map(|pilot| {
            let plan = pilot.flight_plan;
            let logon_time = pilot.logon_time.clone();
            let start_time = logon_time
                .as_deref()
                .and_then(|t| chrono::DateTime::parse_from_rfc3339(t).ok())
                .map(|dt| dt.timestamp());
            let elapsed_time = start_time.map(|st| chrono::Utc::now().timestamp().saturating_sub(st));
            FlightState {
                cid: Some(pilot.cid),
                callsign: Some(pilot.callsign),
                latitude: Some(pilot.latitude),
                longitude: Some(pilot.longitude),
                altitude: Some(pilot.altitude),
                groundspeed: Some(pilot.groundspeed),
                heading: Some(pilot.heading),
                aircraft: plan.as_ref().and_then(|p| p.aircraft_short.clone()),
                departure: plan.as_ref().and_then(|p| p.departure.clone()),
                arrival: plan.as_ref().and_then(|p| p.arrival.clone()),
                route: plan.and_then(|p| p.route),
                start_time,
                logon_time,
                elapsed_time,
                phase: if pilot.groundspeed < 5 {
                    "On ground"
                } else if pilot.altitude < 10000 {
                    "Flying"
                } else {
                    "En route"
                }
                .into(),
                ..FlightState::default()
            }
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_cid_even_if_callsign_changes() {
        let feed: Feed = serde_json::from_str(r#"{"pilots":[{"cid":1234567,"callsign":"NEW456","latitude":42.7,"longitude":23.3,"altitude":36000,"groundspeed":450,"heading":270,"flight_plan":{"aircraft_short":"B738","departure":"LBSF","arrival":"EGLL","route":"DCT"}}]}"#).unwrap();
        let flight = find_pilot(feed.pilots, 1234567).unwrap();
        assert_eq!(flight.callsign.as_deref(), Some("NEW456"));
        assert_eq!(flight.arrival.as_deref(), Some("EGLL"));
    }

    #[test]
    fn ignores_other_cid() {
        let feed: Feed = serde_json::from_str(r#"{"pilots":[{"cid":1234567,"callsign":"ABC1","latitude":0,"longitude":0,"altitude":0,"groundspeed":0,"heading":0,"flight_plan":null}]}"#).unwrap();
        assert!(find_pilot(feed.pilots, 7654321).is_none());
    }
}
