use crate::model::FlightState;
use chrono::{DateTime, Duration, Utc};
use std::{collections::HashMap, sync::OnceLock};

#[derive(Clone, Debug)]
pub struct AirportEntry {
    pub name: String,
    pub lat: f64,
    pub lon: f64,
}

static AIRPORTS: OnceLock<HashMap<String, AirportEntry>> = OnceLock::new();

pub fn airports() -> &'static HashMap<String, AirportEntry> {
    AIRPORTS.get_or_init(|| {
        let mut result = HashMap::new();
        let mut in_airports = false;
        for line in include_str!("../../data/VATSpy.dat").lines() {
            if line == "[Airports]" {
                in_airports = true;
                continue;
            }
            if in_airports && line.starts_with('[') {
                break;
            }
            if !in_airports || line.starts_with(';') {
                continue;
            }
            let mut parts = line.split('|');
            let (Some(code), Some(name), Some(lat), Some(lon)) =
                (parts.next(), parts.next(), parts.next(), parts.next())
            else {
                continue;
            };
            if let (Ok(lat), Ok(lon)) = (lat.parse::<f64>(), lon.parse::<f64>()) {
                if (-90.0..=90.0).contains(&lat) && (-180.0..=180.0).contains(&lon) {
                    result.insert(
                        code.to_string(),
                        AirportEntry {
                            name: name.trim().to_string(),
                            lat,
                            lon,
                        },
                    );
                }
            }
        }
        result
    })
}

pub fn get_airport_name(code: &str) -> Option<&'static str> {
    airports().get(code).map(|a| a.name.as_str())
}

pub fn great_circle_nm(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    let d_lat = (lat2 - lat1).to_radians();
    let d_lon = (lon2 - lon1).to_radians();
    let a = (d_lat / 2.0).sin().powi(2)
        + lat1.to_radians().cos() * lat2.to_radians().cos() * (d_lon / 2.0).sin().powi(2);
    3440.065 * 2.0 * a.sqrt().min(1.0).asin()
}

pub struct FlightTracker {
    last_cid: Option<u32>,
    last_callsign: Option<String>,
    last_departure: Option<String>,
    last_arrival: Option<String>,
    last_logon_time: Option<String>,
    last_altitude: Option<i32>,
    last_update: Option<DateTime<Utc>>,
    smoothed_speed: Option<f64>,
    phase: String,
    phase_candidate: String,
    candidate_count: u8,
    was_airborne: bool,
    departure_elevation: Option<i32>,
}

impl FlightTracker {
    pub fn new() -> Self {
        Self {
            last_cid: None,
            last_callsign: None,
            last_departure: None,
            last_arrival: None,
            last_logon_time: None,
            last_altitude: None,
            last_update: None,
            smoothed_speed: None,
            phase: String::new(),
            phase_candidate: String::new(),
            candidate_count: 0,
            was_airborne: false,
            departure_elevation: None,
        }
    }

    pub fn update(&mut self, flight: &mut FlightState, now: DateTime<Utc>) {
        let is_new_flight = self.last_cid != flight.cid
            || self.last_callsign != flight.callsign
            || self.last_departure != flight.departure
            || self.last_arrival != flight.arrival
            || (flight.logon_time.is_some() && self.last_logon_time != flight.logon_time);

        if is_new_flight {
            *self = Self {
                last_cid: flight.cid,
                last_callsign: flight.callsign.clone(),
                last_departure: flight.departure.clone(),
                last_arrival: flight.arrival.clone(),
                last_logon_time: flight.logon_time.clone(),
                ..Self::new()
            };
        }
        let (lat, lon) = match (flight.latitude, flight.longitude) {
            (Some(lat), Some(lon)) => (lat, lon),
            _ => return,
        };
        let distance_arrival = flight
            .arrival
            .as_ref()
            .and_then(|code| airports().get(code))
            .map(|a| great_circle_nm(lat, lon, a.lat, a.lon));
        let distance_departure = flight
            .departure
            .as_ref()
            .and_then(|code| airports().get(code))
            .map(|a| great_circle_nm(lat, lon, a.lat, a.lon));
        flight.distance_remaining = distance_arrival;
        flight.distance_departure = distance_departure;
        flight.progress = match (
            flight
                .departure
                .as_ref()
                .and_then(|code| airports().get(code)),
            flight
                .arrival
                .as_ref()
                .and_then(|code| airports().get(code)),
            distance_arrival,
        ) {
            (Some(dep), Some(arr), Some(remaining)) => {
                let total = great_circle_nm(dep.lat, dep.lon, arr.lat, arr.lon);
                if total > 0.0 {
                    Some(((1.0 - remaining / total) * 100.0).clamp(0.0, 100.0))
                } else {
                    None
                }
            }
            _ => None,
        };
        flight.departure_name = flight
            .departure
            .as_deref()
            .and_then(get_airport_name)
            .map(String::from);
        flight.arrival_name = flight
            .arrival
            .as_deref()
            .and_then(get_airport_name)
            .map(String::from);

        if let (Some(distance), Some(speed)) = (distance_arrival, flight.groundspeed) {
            if speed >= 80 && distance >= 3.0 {
                let speed = speed as f64;
                let average = self
                    .smoothed_speed
                    .map(|old| {
                        let limited = speed.clamp(old * 0.8, old * 1.2);
                        old * 0.75 + limited * 0.25
                    })
                    .unwrap_or(speed);
                self.smoothed_speed = Some(average);
                let seconds = ((distance / average) * 3600.0).round() as i64;
                flight.time_remaining = Some(seconds);
                flight.eta = Some(
                    (now.clone() + Duration::seconds(seconds))
                        .format("%H:%MZ")
                        .to_string(),
                );
            }
        }

        let altitude = flight.altitude.unwrap_or_default();
        let speed = flight.groundspeed.unwrap_or_default();

        let climb_rate = match (self.last_altitude, self.last_update.as_ref()) {
            (Some(last_alt), Some(last_time))
                if now.signed_duration_since(last_time.clone()).num_seconds() >= 8 =>
            {
                (altitude - last_alt) as f64 * 60.0
                    / now.signed_duration_since(last_time.clone()).num_seconds() as f64
            }
            _ => 0.0,
        };

        // Automatic turnaround / new flight ground reset:
        // If speed < 40 kts and near departure, or stopped at gate, reset airborne status
        if speed < 40 {
            if distance_departure.is_some_and(|d| d < 10.0) {
                self.was_airborne = false;
            } else if (self.phase == "Arrived at Gate" || self.phase == "Landed" || self.phase == "On Gate") && speed < 3 {
                self.was_airborne = false;
            }
        }

        // Record initial elevation on the ground at departure
        if !self.was_airborne && speed < 35 && (self.departure_elevation.is_none() || distance_departure.is_some_and(|d| d < 10.0)) {
            self.departure_elevation = Some(altitude);
        }

        // Determine if airborne:
        // Respects high-elevation airports by using climbed altitude above ground
        let base_alt = self.departure_elevation.unwrap_or(altitude);
        let climbed = altitude.saturating_sub(base_alt);
        if !self.was_airborne {
            if (speed >= 75 && (climbed >= 300 || climb_rate > 250.0))
                || (speed >= 120 && distance_departure.is_some_and(|d| d > 3.0))
                || (speed >= 90 && altitude >= 5000 && climb_rate > 150.0)
            {
                self.was_airborne = true;
            }
        }

        let next_phase = if speed < 40 {
            // Definitively on the ground (taxiing or parked)
            if !self.was_airborne || distance_departure.is_some_and(|d| d < 10.0) {
                if speed < 3 {
                    "On Gate"
                } else {
                    "Taxiing"
                }
            } else if distance_arrival.is_some_and(|d| d < 10.0) {
                if speed < 3 {
                    "Arrived at Gate"
                } else {
                    "Taxiing to Gate"
                }
            } else if speed < 3 {
                "On Gate"
            } else {
                "Taxiing"
            }
        } else if !self.was_airborne {
            if speed >= 40 && distance_departure.is_some_and(|d| d < 4.0) && climbed < 250 {
                "Takeoff Roll"
            } else if (speed >= 40 && distance_departure.is_some_and(|d| d < 15.0))
                || (climb_rate > 280.0 && distance_departure.is_some_and(|d| d < 15.0))
            {
                "Departing"
            } else if climb_rate > 200.0 || speed >= 120 {
                self.was_airborne = true;
                "Climbing"
            } else {
                "Taxiing"
            }
        } else {
            // Truly airborne (speed >= 40 kts and was_airborne is true)
            let prev_was_approach = self.phase == "Short Final" || self.phase == "Final Approach" || self.phase == "Approach";
            if prev_was_approach && climb_rate > 400.0 && speed >= 80 {
                "Go-Around"
            } else if (speed >= 30 && speed < 85 && distance_arrival.is_some_and(|d| d < 4.0))
                || ((self.phase == "Final Approach" || self.phase == "Short Final") && speed < 80 && distance_arrival.is_some_and(|d| d < 5.0))
            {
                "Landed"
            } else if distance_arrival.is_some_and(|d| d <= 4.0) && speed < 190 && climb_rate <= 300.0 {
                "Short Final"
            } else if distance_arrival.is_some_and(|d| d <= 12.0) && speed < 210 && climb_rate <= 300.0 {
                "Final Approach"
            } else if distance_arrival.is_some_and(|d| d <= 35.0) && climb_rate <= 200.0 {
                "Approach"
            } else if climb_rate > 250.0 {
                "Climbing"
            } else if climb_rate < -250.0 {
                "Descending"
            } else if altitude >= 5000 && climb_rate.abs() <= 250.0 && speed >= 80 {
                "Cruising"
            } else {
                "Flying"
            }
        };

        let threshold = match next_phase {
            "Landed" | "Departing" | "Final Approach" | "Short Final" | "Takeoff Roll" | "On Gate" | "Arrived at Gate" | "Go-Around" | "Taxiing" | "Taxiing to Gate" => 1,
            _ => 2,
        };

        if self.phase.is_empty() {
            self.phase = next_phase.into();
        }
        if next_phase == self.phase {
            self.candidate_count = 0;
        } else if self.phase_candidate == next_phase {
            self.candidate_count += 1;
            if self.candidate_count >= threshold {
                self.phase = next_phase.into();
                self.candidate_count = 0;
            }
        } else {
            self.phase_candidate = next_phase.into();
            self.candidate_count = 1;
            if threshold == 1 {
                self.phase = next_phase.into();
                self.candidate_count = 0;
            }
        }
        flight.phase = self.phase.clone();
        self.last_altitude = flight.altitude;
        self.last_update = Some(now);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn great_circle_between_known_airports() {
        let sof = &airports()["LBSF"];
        let lhr = &airports()["EGLL"];
        assert_eq!(sof.name, "Sofia");
        assert_eq!(lhr.name, "London Heathrow");
        let distance = great_circle_nm(sof.lat, sof.lon, lhr.lat, lhr.lon);
        assert!(distance > 1000.0 && distance < 1200.0);
    }

    #[test]
    fn eta_uses_live_speed() {
        let mut flight = FlightState {
            cid: Some(123),
            latitude: Some(42.6977),
            longitude: Some(23.3219),
            arrival: Some("EGLL".into()),
            groundspeed: Some(450),
            altitude: Some(36000),
            ..FlightState::default()
        };
        let mut tracker = FlightTracker::new();
        tracker.update(&mut flight, Utc::now());
        assert!(flight.time_remaining.unwrap() > 7000);
        assert!(flight.eta.is_some());
    }
}
