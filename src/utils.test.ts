import { describe, expect, it } from 'vitest';
import { defaultSettings } from './types';
import type { FlightState } from './types';
import { flightLevel, formatDuration, getCountry, getFlyingOver, getSmartStatus, getVatsimMapUrl, greatCircleDistance, renderTemplate } from './utils';

const flight: FlightState = {
  cid: 1234567, callsign: 'RYR8AB', departure: 'LBSF', arrival: 'EGLL', aircraft: 'B738',
  latitude: 42.696, longitude: 23.411, altitude: 36000, groundspeed: 452, heading: 288,
  route: 'DCT', frequency: null, phase: 'Cruising', distanceRemaining: 694, progress: 42,
  timeRemaining: 6120, eta: '17:31Z',
};

describe('flight display logic', () => {
  it('formats flight level', () => expect(flightLevel(36000)).toBe('FL360'));
  it('calculates great-circle distance in nautical miles', () => {
    expect(greatCircleDistance(42.6977, 23.3219, 51.4700, -0.4543)).toBeGreaterThan(1000);
    expect(greatCircleDistance(42.6977, 23.3219, 51.4700, -0.4543)).toBeLessThan(1200);
  });
  it('removes missing variables without leaving separators', () => {
    expect(renderTemplate('{callsign} • {aircraft} • {frequency}', flight, defaultSettings)).toBe('RYR8AB • B738');
  });
  it('formats default details template with VATSIM and airport collapse', () => {
    const egllToEgbb: FlightState = { ...flight, departure: 'EGLL', arrival: 'EGBB' };
    expect(renderTemplate(defaultSettings.detailsTemplate, egllToEgbb, defaultSettings)).toBe('EGLL → EGBB • VATSIM');
    expect(renderTemplate('{network}', flight, defaultSettings)).toBe('VATSIM');
    expect(renderTemplate('{flying_as}', flight, defaultSettings)).toBe('Flying as RYR8AB on VATSIM');
    expect(renderTemplate(defaultSettings.detailsTemplate, { ...flight, departure: null, arrival: null }, defaultSettings)).toBe('VATSIM');
  });
  it('strips arbitrary custom text from templates to protect against abuse', () => {
    expect(renderTemplate('{departure} → {arrival} • VATSIM Testing app', flight, defaultSettings)).toBe('LBSF → EGLL • VATSIM');
    expect(renderTemplate('{smart_status} • {distance_remaining} • {callsign} • wefsdfsdf', flight, defaultSettings)).toBe('Cruising over Bulgaria at FL360 • 694 NM • RYR8AB');
    expect(renderTemplate('BadWord {callsign} MoreBadWords', flight, defaultSettings)).toBe('RYR8AB');
  });
  it('detects country based on coordinates', () => {
    expect(getCountry(42.696, 23.411)).toBe('Bulgaria');
    expect(getCountry(48.31, 8.62)).toBe('Germany');
    expect(getCountry(51.5, -0.1)).toBe('United Kingdom');
  });
  it('formats flying over phrase', () => {
    expect(getFlyingOver(42.696, 23.411)).toBe('Flying over Bulgaria');
    expect(getFlyingOver(48.31, 8.62)).toBe('Flying over Germany');
  });
  it('renders smart status token', () => {
    expect(getSmartStatus(flight, defaultSettings)).toBe('Cruising over Bulgaria at FL360');
    expect(renderTemplate('{smart_status} • {callsign}', flight, defaultSettings)).toBe('Cruising over Bulgaria at FL360 • RYR8AB');
  });
  it('generates direct radar URLs for vatsim.privatesearch.xyz', () => {
    expect(getVatsimMapUrl(flight, defaultSettings)).toBe('https://vatsim.privatesearch.xyz/pilot/1234567');
    expect(getVatsimMapUrl({ ...flight, cid: null }, { ...defaultSettings, cid: '7654321' })).toBe('https://vatsim.privatesearch.xyz/pilot/7654321');
    expect(getVatsimMapUrl({ ...flight, cid: null, callsign: 'AFR123' }, defaultSettings)).toBe('https://vatsim.privatesearch.xyz/data/flights/AFR123');
    expect(getVatsimMapUrl(null, defaultSettings)).toBe('https://vatsim.privatesearch.xyz/');
  });
  it('formats duration', () => {
    expect(formatDuration(3600)).toBe('1h 0m');
    expect(formatDuration(6120)).toBe('1h 42m');
    expect(formatDuration(300)).toBe('5m');
    expect(formatDuration(null)).toBeNull();
  });
  it('default settings includes remaining timeMode', () => {
    expect(defaultSettings.timeMode).toBe('remaining');
  });
  it('formats smart approach with city name and custom template', () => {
    const approachFlight: FlightState = {
      ...flight,
      callsign: 'UKA509',
      departure: 'EGKK',
      departureName: 'London Gatwick',
      arrival: 'EGPF',
      arrivalName: 'Glasgow',
      phase: 'Approach',
    };
    // Default format: "name" (shows Glasgow)
    expect(getSmartStatus(approachFlight, defaultSettings)).toBe('On Approach to Glasgow');
    expect(renderTemplate('{smart_status} • {callsign}', approachFlight, defaultSettings)).toBe('On Approach to Glasgow • UKA509');

    // Both format: "both" (shows EGPF (Glasgow))
    expect(getSmartStatus(approachFlight, { ...defaultSettings, airportFormat: 'both' })).toBe('On Approach to EGPF (Glasgow)');

    // ICAO only format: "icao" (shows EGPF)
    expect(getSmartStatus(approachFlight, { ...defaultSettings, airportFormat: 'icao' })).toBe('On Approach to EGPF');

    // Custom approach template: "Landing at {airport}"
    expect(getSmartStatus(approachFlight, { ...defaultSettings, approachTemplate: 'Landing at {airport}' })).toBe('Landing at Glasgow');
  });

  it('correctly handles all smart mode flight phases without errors', () => {
    const base: FlightState = {
      ...flight,
      departure: 'LBSF',
      departureName: 'Sofia',
      arrival: 'EDDF',
      arrivalName: 'Frankfurt',
    };

    expect(getSmartStatus({ ...base, phase: 'On Gate' }, defaultSettings)).toBe('At Gate - Sofia');
    expect(getSmartStatus({ ...base, phase: 'Taxiing' }, defaultSettings)).toBe('Taxiing at Sofia');
    expect(getSmartStatus({ ...base, phase: 'Takeoff Roll' }, defaultSettings)).toBe('Takeoff Roll at Sofia');
    expect(getSmartStatus({ ...base, phase: 'Departing' }, defaultSettings)).toBe('Departing Sofia');
    expect(getSmartStatus({ ...base, phase: 'Climbing' }, defaultSettings)).toBe('Climbing over Bulgaria - Passing FL360');
    expect(getSmartStatus({ ...base, phase: 'Final Approach' }, defaultSettings)).toBe('On Final for Frankfurt');
    expect(getSmartStatus({ ...base, phase: 'Short Final' }, defaultSettings)).toBe('On Short Final for Frankfurt');
    expect(getSmartStatus({ ...base, phase: 'Go-Around' }, defaultSettings)).toBe('Go-Around at Frankfurt');
    expect(getSmartStatus({ ...base, phase: 'Landed' }, defaultSettings)).toBe('Landed at Frankfurt');
    expect(getSmartStatus({ ...base, phase: 'Taxiing to Gate' }, defaultSettings)).toBe('Taxiing to Gate at Frankfurt');
    expect(getSmartStatus({ ...base, phase: 'Arrived at Gate' }, defaultSettings)).toBe('Arrived at Frankfurt');
    expect(getSmartStatus({ ...base, phase: 'Cruising', latitude: 50.0, longitude: -30.0 }, defaultSettings)).toBe('Crossing the North Atlantic at FL360');
  });

  it('populates flight_time template token when elapsed time is available', () => {
    const activeFlight: FlightState = {
      ...flight,
      elapsedTime: 5400, // 1h 30m
    };
    expect(renderTemplate('{callsign} • {flight_time}', activeFlight, defaultSettings)).toBe('RYR8AB • 1h 30m');
  });
});

