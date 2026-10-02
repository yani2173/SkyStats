export type TimeMode = 'remaining' | 'elapsed' | 'none';
export type AirportFormat = 'name' | 'both' | 'icao';
export type SimulatorType = 'auto' | 'msfs2024' | 'msfs2020' | 'xplane' | 'none';

export type Settings = {
  setupComplete: boolean;
  cid: string;
  discordApplicationId?: string;
  enabled: boolean;
  minimizeToTray: boolean;
  demoMode?: boolean;
  theme: string;
  preset: string;
  detailsTemplate: string;
  stateTemplate: string;
  timeMode: TimeMode;
  airportFormat?: AirportFormat;
  approachTemplate?: string;
  simulator?: SimulatorType;
};

export type FlightState = {
  cid: number | null;
  callsign: string | null;
  departure: string | null;
  departureName?: string | null;
  arrival: string | null;
  arrivalName?: string | null;
  aircraft: string | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  groundspeed: number | null;
  heading: number | null;
  route: string | null;
  frequency: string | null;
  phase: string;
  distanceRemaining: number | null;
  distanceDeparture?: number | null;
  progress: number | null;
  timeRemaining: number | null;
  startTime?: number | null;
  logonTime?: string | null;
  elapsedTime?: number | null;
  eta: string | null;
};

export type Snapshot = {
  settings: Settings;
  flight: FlightState | null;
  vatsimStatus: string;
  discordStatus: string;
  message: string;
  lastUpdated: string | null;
};

export const defaultSettings: Settings = {
  setupComplete: false, cid: '', discordApplicationId: '', enabled: true, minimizeToTray: true,
  theme: 'dark', preset: 'Standard',
  detailsTemplate: '{departure} → {arrival} • VATSIM',
  stateTemplate: '{callsign} • {aircraft} • {flight_level}',
  timeMode: 'remaining',
  airportFormat: 'name',
  approachTemplate: 'On Approach to {airport}',
  simulator: 'auto',
};

export const presets = {
  Minimal: { detailsTemplate: '{departure} → {arrival} • VATSIM', stateTemplate: '{callsign} • {aircraft}' },
  Standard: { detailsTemplate: '{departure} → {arrival} • VATSIM', stateTemplate: '{callsign} • {aircraft} • {flight_level}' },
  Detailed: { detailsTemplate: '{callsign} • {aircraft} • {flight_level}', stateTemplate: '{distance_remaining} • {time_remaining}' },
  Smart: { detailsTemplate: '{departure} → {arrival} • VATSIM', stateTemplate: '{smart_status} • {callsign}' },
};
