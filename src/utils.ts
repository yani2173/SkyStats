import type { FlightState, Settings } from './types';

export function flightLevel(altitude: number | null): string | null {
  return altitude === null ? null : `FL${String(Math.round(altitude / 100)).padStart(3, '0')}`;
}

export function formatDuration(seconds: number | null): string | null {
  if (seconds === null || seconds < 0) return null;
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export interface RegionBound {
  name: string;
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export const REGIONS: RegionBound[] = [
  // Micro-states & small islands (must be matched before surrounding nations)
  { name: 'Monaco', minLat: 43.72, maxLat: 43.76, minLon: 7.41, maxLon: 7.44 },
  { name: 'Gibraltar', minLat: 36.10, maxLat: 36.16, minLon: -5.37, maxLon: -5.33 },
  { name: 'San Marino', minLat: 43.90, maxLat: 43.98, minLon: 12.42, maxLon: 12.52 },
  { name: 'Liechtenstein', minLat: 47.05, maxLat: 47.27, minLon: 9.47, maxLon: 9.64 },
  { name: 'Andorra', minLat: 42.42, maxLat: 42.66, minLon: 1.41, maxLon: 1.79 },
  { name: 'Singapore', minLat: 1.20, maxLat: 1.48, minLon: 103.60, maxLon: 104.05 },
  { name: 'Bahrain', minLat: 25.80, maxLat: 26.35, minLon: 50.40, maxLon: 50.75 },
  { name: 'Malta', minLat: 35.75, maxLat: 36.10, minLon: 14.15, maxLon: 14.60 },
  { name: 'Qatar', minLat: 24.50, maxLat: 26.20, minLon: 50.70, maxLon: 51.70 },
  { name: 'Luxembourg', minLat: 49.44, maxLat: 50.18, minLon: 5.73, maxLon: 6.53 },
  { name: 'Hong Kong', minLat: 22.15, maxLat: 22.58, minLon: 113.80, maxLon: 114.45 },
  { name: 'Lebanon', minLat: 33.05, maxLat: 34.70, minLon: 35.10, maxLon: 36.65 },
  { name: 'Cyprus', minLat: 34.57, maxLat: 35.70, minLon: 32.27, maxLon: 34.60 },
  { name: 'Kuwait', minLat: 28.50, maxLat: 30.10, minLon: 46.50, maxLon: 48.50 },
  { name: 'Israel', minLat: 29.45, maxLat: 33.35, minLon: 34.25, maxLon: 35.90 },
  { name: 'Faroe Islands', minLat: 61.35, maxLat: 62.45, minLon: -7.75, maxLon: -6.25 },
  { name: 'the Maldives', minLat: -0.70, maxLat: 7.20, minLon: 72.50, maxLon: 73.80 },
  { name: 'Jamaica', minLat: 17.70, maxLat: 18.60, minLon: -78.40, maxLon: -76.20 },
  { name: 'Puerto Rico', minLat: 17.85, maxLat: 18.55, minLon: -67.30, maxLon: -65.20 },
  { name: 'the Bahamas', minLat: 20.80, maxLat: 27.30, minLon: -79.30, maxLon: -72.70 },

  // European Nations
  { name: 'Switzerland', minLat: 45.81, maxLat: 47.81, minLon: 5.95, maxLon: 10.50 },
  { name: 'Belgium', minLat: 49.49, maxLat: 51.51, minLon: 2.54, maxLon: 6.41 },
  { name: 'Netherlands', minLat: 50.75, maxLat: 53.55, minLon: 3.36, maxLon: 7.23 },
  { name: 'Slovenia', minLat: 45.42, maxLat: 46.88, minLon: 13.38, maxLon: 16.61 },
  { name: 'Austria', minLat: 46.37, maxLat: 49.02, minLon: 9.53, maxLon: 17.16 },
  { name: 'Czechia', minLat: 48.55, maxLat: 51.06, minLon: 12.09, maxLon: 18.86 },
  { name: 'Slovakia', minLat: 47.73, maxLat: 49.61, minLon: 16.83, maxLon: 22.57 },
  { name: 'Hungary', minLat: 45.74, maxLat: 48.58, minLon: 16.11, maxLon: 22.90 },
  { name: 'Croatia', minLat: 42.39, maxLat: 46.55, minLon: 13.49, maxLon: 19.45 },
  { name: 'Bosnia & Herzegovina', minLat: 42.55, maxLat: 45.28, minLon: 15.72, maxLon: 19.63 },
  { name: 'Serbia', minLat: 42.24, maxLat: 46.19, minLon: 18.84, maxLon: 23.01 },
  { name: 'Montenegro', minLat: 41.85, maxLat: 43.55, minLon: 18.42, maxLon: 20.35 },
  { name: 'Kosovo', minLat: 41.85, maxLat: 43.27, minLon: 20.01, maxLon: 21.80 },
  { name: 'North Macedonia', minLat: 40.85, maxLat: 42.36, minLon: 20.45, maxLon: 23.04 },
  { name: 'Albania', minLat: 39.64, maxLat: 42.66, minLon: 19.26, maxLon: 21.06 },
  { name: 'Bulgaria', minLat: 41.23, maxLat: 44.22, minLon: 22.35, maxLon: 28.61 },
  { name: 'Romania', minLat: 43.62, maxLat: 48.27, minLon: 20.26, maxLon: 29.71 },
  { name: 'Moldova', minLat: 45.45, maxLat: 48.50, minLon: 26.60, maxLon: 30.20 },
  { name: 'Greece', minLat: 34.80, maxLat: 41.75, minLon: 19.37, maxLon: 28.25 },
  { name: 'Estonia', minLat: 57.50, maxLat: 59.70, minLon: 21.75, maxLon: 28.20 },
  { name: 'Latvia', minLat: 55.65, maxLat: 58.10, minLon: 20.95, maxLon: 28.25 },
  { name: 'Lithuania', minLat: 53.85, maxLat: 56.45, minLon: 20.95, maxLon: 26.85 },
  { name: 'Poland', minLat: 49.00, maxLat: 54.84, minLon: 14.12, maxLon: 24.15 },
  { name: 'Germany', minLat: 47.27, maxLat: 55.06, minLon: 5.87, maxLon: 15.04 },
  { name: 'Denmark', minLat: 54.55, maxLat: 57.75, minLon: 8.07, maxLon: 12.69 },
  { name: 'Ireland', minLat: 51.42, maxLat: 55.44, minLon: -10.66, maxLon: -5.43 },
  { name: 'United Kingdom', minLat: 49.96, maxLat: 58.67, minLon: -8.65, maxLon: 1.77 },
  { name: 'France', minLat: 42.33, maxLat: 51.09, minLon: -4.79, maxLon: 8.23 },
  { name: 'Spain', minLat: 36.00, maxLat: 43.79, minLon: -9.30, maxLon: 3.33 },
  { name: 'Portugal', minLat: 36.96, maxLat: 42.15, minLon: -9.53, maxLon: -6.19 },
  { name: 'Italy', minLat: 36.65, maxLat: 47.09, minLon: 6.63, maxLon: 18.52 },
  { name: 'Norway', minLat: 57.98, maxLat: 71.18, minLon: 4.64, maxLon: 31.06 },
  { name: 'Sweden', minLat: 55.34, maxLat: 69.06, minLon: 11.03, maxLon: 24.17 },
  { name: 'Finland', minLat: 59.73, maxLat: 70.09, minLon: 20.55, maxLon: 31.59 },
  { name: 'Iceland', minLat: 63.30, maxLat: 66.60, minLon: -24.60, maxLon: -13.50 },
  { name: 'Ukraine', minLat: 44.35, maxLat: 52.40, minLon: 22.15, maxLon: 40.20 },
  { name: 'Belarus', minLat: 51.25, maxLat: 56.17, minLon: 23.18, maxLon: 32.78 },

  // Middle East & Central Asia
  { name: 'Georgia', minLat: 41.05, maxLat: 43.60, minLon: 39.95, maxLon: 46.75 },
  { name: 'Armenia', minLat: 38.80, maxLat: 41.30, minLon: 43.45, maxLon: 46.65 },
  { name: 'Azerbaijan', minLat: 38.35, maxLat: 41.90, minLon: 44.75, maxLon: 50.85 },
  { name: 'Turkey', minLat: 35.82, maxLat: 42.10, minLon: 25.66, maxLon: 44.82 },
  { name: 'Jordan', minLat: 29.18, maxLat: 33.37, minLon: 34.95, maxLon: 39.30 },
  { name: 'United Arab Emirates', minLat: 22.63, maxLat: 26.08, minLon: 51.58, maxLon: 56.38 },
  { name: 'Oman', minLat: 16.65, maxLat: 26.40, minLon: 51.85, maxLon: 59.85 },
  { name: 'Saudi Arabia', minLat: 16.35, maxLat: 32.15, minLon: 34.50, maxLon: 55.70 },
  { name: 'Iraq', minLat: 29.05, maxLat: 37.38, minLon: 38.75, maxLon: 48.60 },
  { name: 'Iran', minLat: 25.05, maxLat: 39.78, minLon: 44.05, maxLon: 63.35 },
  { name: 'Kazakhstan', minLat: 40.56, maxLat: 55.43, minLon: 46.49, maxLon: 87.31 },
  { name: 'Uzbekistan', minLat: 37.18, maxLat: 45.57, minLon: 56.00, maxLon: 73.15 },

  // Asia & Pacific
  { name: 'Taiwan', minLat: 21.85, maxLat: 25.30, minLon: 119.95, maxLon: 122.10 },
  { name: 'South Korea', minLat: 34.25, maxLat: 38.60, minLon: 126.05, maxLon: 129.60 },
  { name: 'Japan', minLat: 30.98, maxLat: 45.52, minLon: 129.54, maxLon: 145.82 },
  { name: 'Thailand', minLat: 5.60, maxLat: 20.45, minLon: 97.35, maxLon: 105.65 },
  { name: 'Vietnam', minLat: 8.35, maxLat: 23.40, minLon: 102.15, maxLon: 109.50 },
  { name: 'Malaysia', minLat: 0.85, maxLat: 7.40, minLon: 99.60, maxLon: 119.30 },
  { name: 'the Philippines', minLat: 4.65, maxLat: 21.15, minLon: 116.90, maxLon: 126.60 },
  { name: 'Indonesia', minLat: -11.00, maxLat: 6.00, minLon: 95.00, maxLon: 141.00 },
  { name: 'Pakistan', minLat: 23.65, maxLat: 37.10, minLon: 60.85, maxLon: 77.85 },
  { name: 'India', minLat: 8.05, maxLat: 35.50, minLon: 68.10, maxLon: 97.40 },
  { name: 'Bangladesh', minLat: 20.74, maxLat: 26.63, minLon: 88.01, maxLon: 92.67 },
  { name: 'Sri Lanka', minLat: 5.92, maxLat: 9.84, minLon: 79.69, maxLon: 81.88 },
  { name: 'Nepal', minLat: 26.35, maxLat: 30.45, minLon: 80.06, maxLon: 88.20 },
  { name: 'China', minLat: 18.15, maxLat: 53.55, minLon: 73.50, maxLon: 134.80 },
  { name: 'Australia', minLat: -43.63, maxLat: -10.69, minLon: 113.34, maxLon: 153.57 },
  { name: 'New Zealand', minLat: -47.30, maxLat: -34.40, minLon: 166.45, maxLon: 178.60 },

  // Americas
  { name: 'Panama', minLat: 7.20, maxLat: 9.65, minLon: -83.05, maxLon: -77.15 },
  { name: 'Costa Rica', minLat: 8.05, maxLat: 11.20, minLon: -85.95, maxLon: -82.55 },
  { name: 'the Dominican Republic', minLat: 17.55, maxLat: 19.95, minLon: -72.00, maxLon: -68.30 },
  { name: 'Cuba', minLat: 19.80, maxLat: 23.30, minLon: -84.95, maxLon: -74.15 },
  { name: 'Mexico', minLat: 14.53, maxLat: 32.72, minLon: -117.13, maxLon: -86.71 },
  { name: 'the United States', minLat: 24.52, maxLat: 49.38, minLon: -125.00, maxLon: -66.93 },
  { name: 'Canada', minLat: 41.68, maxLat: 70.00, minLon: -141.00, maxLon: -52.62 },
  { name: 'Colombia', minLat: -4.25, maxLat: 12.50, minLon: -79.05, maxLon: -66.85 },
  { name: 'Venezuela', minLat: 0.65, maxLat: 12.20, minLon: -73.38, maxLon: -59.80 },
  { name: 'Ecuador', minLat: -5.02, maxLat: 1.45, minLon: -81.08, maxLon: -75.19 },
  { name: 'Peru', minLat: -18.35, maxLat: -0.05, minLon: -81.35, maxLon: -68.65 },
  { name: 'Bolivia', minLat: -22.90, maxLat: -9.68, minLon: -69.64, maxLon: -57.45 },
  { name: 'Chile', minLat: -55.90, maxLat: -17.50, minLon: -75.65, maxLon: -66.95 },
  { name: 'Argentina', minLat: -55.10, maxLat: -21.80, minLon: -73.60, maxLon: -53.60 },
  { name: 'Paraguay', minLat: -27.60, maxLat: -19.30, minLon: -62.65, maxLon: -54.25 },
  { name: 'Uruguay', minLat: -35.02, maxLat: -30.08, minLon: -58.44, maxLon: -53.09 },
  { name: 'Brazil', minLat: -33.75, maxLat: 5.25, minLon: -73.95, maxLon: -34.80 },

  // Africa
  { name: 'Tunisia', minLat: 30.25, maxLat: 37.55, minLon: 7.50, maxLon: 11.60 },
  { name: 'Morocco', minLat: 27.65, maxLat: 35.95, minLon: -13.15, maxLon: -1.05 },
  { name: 'Egypt', minLat: 22.00, maxLat: 31.67, minLon: 25.00, maxLon: 36.90 },
  { name: 'Algeria', minLat: 19.00, maxLat: 37.10, minLon: -8.70, maxLon: 12.00 },
  { name: 'South Africa', minLat: -34.85, maxLat: -22.15, minLon: 16.45, maxLon: 32.90 },
  { name: 'Kenya', minLat: -4.70, maxLat: 5.45, minLon: 33.90, maxLon: 41.90 },
  { name: 'Ethiopia', minLat: 3.40, maxLat: 14.89, minLon: 32.99, maxLon: 47.99 },
  { name: 'Tanzania', minLat: -11.75, maxLat: -0.98, minLon: 29.30, maxLon: 40.45 },
  { name: 'Nigeria', minLat: 4.25, maxLat: 13.90, minLon: 2.65, maxLon: 14.70 },
  { name: 'Ghana', minLat: 4.74, maxLat: 11.17, minLon: -3.26, maxLon: 1.20 },

  // Specific Seas & Straits (evaluated if not over land)
  { name: 'the English Channel', minLat: 49.20, maxLat: 51.20, minLon: -4.50, maxLon: 1.80 },
  { name: 'the Bay of Biscay', minLat: 43.50, maxLat: 48.50, minLon: -9.50, maxLon: -1.50 },
  { name: 'the Irish Sea', minLat: 52.00, maxLat: 55.00, minLon: -6.50, maxLon: -3.00 },
  { name: 'the Celtic Sea', minLat: 49.00, maxLat: 52.00, minLon: -11.00, maxLon: -5.00 },
  { name: 'the North Sea', minLat: 51.50, maxLat: 61.50, minLon: -2.00, maxLon: 8.50 },
  { name: 'the Adriatic Sea', minLat: 40.50, maxLat: 45.80, minLon: 12.00, maxLon: 19.50 },
  { name: 'the Ionian Sea', minLat: 35.50, maxLat: 40.50, minLon: 15.00, maxLon: 21.50 },
  { name: 'the Aegean Sea', minLat: 35.00, maxLat: 41.00, minLon: 22.50, maxLon: 28.00 },
  { name: 'the Tyrrhenian Sea', minLat: 38.00, maxLat: 44.00, minLon: 9.50, maxLon: 16.00 },
  { name: 'the Persian Gulf', minLat: 23.50, maxLat: 30.50, minLon: 48.00, maxLon: 56.50 },
  { name: 'the Red Sea', minLat: 12.50, maxLat: 28.50, minLon: 32.50, maxLon: 43.50 },
  { name: 'the Gulf of Mexico', minLat: 18.00, maxLat: 30.50, minLon: -98.00, maxLon: -80.00 },

  // Major Broad Seas & Oceans
  { name: 'the Baltic Sea', minLat: 53.50, maxLat: 65.50, minLon: 10.00, maxLon: 30.00 },
  { name: 'the Black Sea', minLat: 40.90, maxLat: 46.60, minLon: 27.50, maxLon: 41.80 },
  { name: 'the Mediterranean Sea', minLat: 30.00, maxLat: 45.00, minLon: -5.00, maxLon: 36.00 },
  { name: 'the Caribbean Sea', minLat: 9.00, maxLat: 22.00, minLon: -88.00, maxLon: -60.00 },
  { name: 'the Arabian Sea', minLat: 10.00, maxLat: 25.00, minLon: 55.00, maxLon: 75.00 },
  { name: 'the Bay of Bengal', minLat: 5.00, maxLat: 22.00, minLon: 80.00, maxLon: 95.00 },
  { name: 'the South China Sea', minLat: 3.00, maxLat: 22.00, minLon: 105.00, maxLon: 120.00 },
  { name: 'the Sea of Japan', minLat: 35.00, maxLat: 52.00, minLon: 128.00, maxLon: 142.00 },
  { name: 'the Norwegian Sea', minLat: 62.00, maxLat: 72.00, minLon: -5.00, maxLon: 15.00 },
  { name: 'the Coral Sea', minLat: -28.00, maxLat: -10.00, minLon: 145.00, maxLon: 165.00 },
  { name: 'the Tasman Sea', minLat: -48.00, maxLat: -28.00, minLon: 150.00, maxLon: 172.00 },
  { name: 'the Indian Ocean', minLat: -60.00, maxLat: 12.00, minLon: 35.00, maxLon: 115.00 },
  { name: 'the North Atlantic', minLat: 20.00, maxLat: 65.00, minLon: -60.00, maxLon: -10.00 },
  { name: 'the South Atlantic', minLat: -60.00, maxLat: 0.00, minLon: -50.00, maxLon: 15.00 },
  { name: 'the North Pacific', minLat: 10.00, maxLat: 60.00, minLon: 140.00, maxLon: -125.00 },
  { name: 'the South Pacific', minLat: -60.00, maxLat: 0.00, minLon: 150.00, maxLon: -70.00 },
];

export function getCountry(lat: number | null, lon: number | null): string | null {
  if (lat === null || lon === null) return null;
  for (const r of REGIONS) {
    if (lat >= r.minLat && lat <= r.maxLat && lon >= r.minLon && lon <= r.maxLon) {
      return r.name;
    }
  }
  return null;
}

const KNOWN_AIRPORTS: Record<string, string> = {
  // Bulgaria & Balkans
  LBSF: 'Sofia',
  LBWN: 'Varna',
  LBBG: 'Burgas',
  LBPD: 'Plovdiv',
  BKPR: 'Pristina',
  LWSK: 'Skopje',
  LATI: 'Tirana',
  LYBE: 'Belgrade',
  LDZA: 'Zagreb',
  LQSA: 'Sarajevo',
  LROP: 'Bucharest Henri Coanda',
  LRCL: 'Cluj-Napoca',

  // United Kingdom & Ireland
  EGLL: 'London Heathrow',
  EGKK: 'London Gatwick',
  EGSS: 'London Stansted',
  EGGW: 'London Luton',
  EGLC: 'London City',
  EGCC: 'Manchester',
  EGPF: 'Glasgow',
  EGPH: 'Edinburgh',
  EGBB: 'Birmingham',
  EGGD: 'Bristol',
  EGNX: 'East Midlands',
  EIDW: 'Dublin',
  EICK: 'Cork',

  // Western Europe
  EHAM: 'Amsterdam Schiphol',
  EBBR: 'Brussels',
  ELLX: 'Luxembourg',
  LFPG: 'Paris Charles de Gaulle',
  LFPO: 'Paris Orly',
  LFMN: 'Nice Cote dAzur',
  LFLL: 'Lyon-Saint Exupery',
  EDDF: 'Frankfurt',
  EDDM: 'Munich',
  EDDB: 'Berlin Brandenburg',
  EDDH: 'Hamburg',
  EDDK: 'Cologne Bonn',
  EDDL: 'Dusseldorf',
  LOWW: 'Vienna',
  LSZH: 'Zurich',
  LSGG: 'Geneva',

  // Southern Europe
  // Mediterranean, Holidays & Iberia
  LEMD: 'Madrid-Barajas',
  LEBL: 'Barcelona',
  LEPA: 'Palma de Mallorca',
  LEIB: 'Ibiza',
  LEMH: 'Menorca',
  LEAL: 'Alicante',
  LEMG: 'Malaga',
  LEST: 'Santiago de Compostela',
  LPPT: 'Lisbon',
  LPPR: 'Porto',
  LPFR: 'Faro',
  LPMA: 'Madeira',
  GCTS: 'Tenerife South',
  GCXO: 'Tenerife North',
  GCLP: 'Gran Canaria',
  GCRR: 'Lanzarote',
  LIRF: 'Rome Fiumicino',
  LIRA: 'Rome Ciampino',
  LIMC: 'Milan Malpensa',
  LIML: 'Milan Linate',
  LIME: 'Milan Bergamo',
  LIPZ: 'Venice',
  LIPX: 'Verona',
  LIPE: 'Bologna',
  LICC: 'Catania',
  LICJ: 'Palermo',
  LIBD: 'Bari',
  LGAV: 'Athens',
  LGTS: 'Thessaloniki',
  LGIR: 'Heraklion',
  LGRP: 'Rhodes',
  LGKO: 'Kos',
  LGKR: 'Corfu',
  LGSR: 'Santorini',
  LGMT: 'Mykonos',
  LGSA: 'Chania',
  LMML: 'Malta',
  LCLK: 'Larnaca',
  LCPH: 'Paphos',

  // Central & Eastern Europe & Nordics
  LKPR: 'Prague',
  EPWA: 'Warsaw Chopin',
  EPKK: 'Krakow',
  EPGD: 'Gdansk',
  EPKT: 'Katowice',
  LZIB: 'Bratislava',
  LHBP: 'Budapest',
  EKCH: 'Copenhagen',
  EKBI: 'Billund',
  ENGM: 'Oslo Gardermoen',
  ENBR: 'Bergen',
  ENZV: 'Stavanger',
  ENVA: 'Trondheim',
  ESSA: 'Stockholm Arlanda',
  ESGG: 'Gothenburg Landvetter',
  ESMS: 'Malmo',
  EFHK: 'Helsinki',
  BIKF: 'Keflavik',
  LTFM: 'Istanbul',
  LTFJ: 'Istanbul Sabiha Gokcen',
  LTAI: 'Antalya',
  LTBJ: 'Izmir Adnan Menderes',
  LTBS: 'Dalaman',

  // Middle East & North Africa
  OMDB: 'Dubai Intl',
  OMDW: 'Dubai Al Maktoum',
  OMAA: 'Abu Dhabi',
  OTHH: 'Doha Hamad',
  OERK: 'Riyadh',
  OEJN: 'Jeddah',
  OBBI: 'Bahrain',
  OKBK: 'Kuwait',
  LLBG: 'Tel Aviv',
  HECA: 'Cairo',
  HESH: 'Sharm El Sheikh',
  HEGN: 'Hurghada',
  GMMN: 'Casablanca',
  DTTA: 'Tunis-Carthage',

  // North America
  KJFK: 'New York JFK',
  KEWR: 'Newark',
  KLGA: 'New York LaGuardia',
  KBOS: 'Boston Logan',
  KIAD: 'Washington Dulles',
  KDCA: 'Washington Reagan',
  KBWI: 'Baltimore',
  KATL: 'Atlanta',
  KMIA: 'Miami',
  KFLL: 'Fort Lauderdale',
  KMCO: 'Orlando',
  KTPA: 'Tampa',
  KCLT: 'Charlotte',
  KORD: "Chicago O'Hare",
  KMDW: 'Chicago Midway',
  KDFW: 'Dallas/Fort Worth',
  KIAH: 'Houston Intercontinental',
  KHOU: 'Houston Hobby',
  KAUS: 'Austin',
  KDEN: 'Denver',
  KPHX: 'Phoenix',
  KLAS: 'Las Vegas',
  KLAX: 'Los Angeles',
  KSAN: 'San Diego',
  KSFO: 'San Francisco',
  KOAK: 'Oakland',
  KSJC: 'San Jose',
  KSEA: 'Seattle-Tacoma',
  KPDX: 'Portland',
  KSLC: 'Salt Lake City',
  KMSP: 'Minneapolis-St Paul',
  KDTW: 'Detroit',
  PHNL: 'Honolulu',
  PANC: 'Anchorage',
  CYYZ: 'Toronto Pearson',
  CYVR: 'Vancouver',
  CYUL: 'Montreal Trudeau',
  CYYC: 'Calgary',
  CYEG: 'Edmonton',
  CYOW: 'Ottawa',
  MMMX: 'Mexico City',
  MMUN: 'Cancun',

  // Asia & Oceania
  RJTT: 'Tokyo Haneda',
  RJAA: 'Tokyo Narita',
  RJBB: 'Osaka Kansai',
  RKSI: 'Seoul Incheon',
  VHHH: 'Hong Kong',
  RCTP: 'Taipei Taoyuan',
  VTBS: 'Bangkok Suvarnabhumi',
  VTSP: 'Phuket',
  WSSS: 'Singapore Changi',
  WMKK: 'Kuala Lumpur',
  WADD: 'Bali Ngurah Rai',
  VIDP: 'Delhi Indira Gandhi',
  VABB: 'Mumbai',
  YSSY: 'Sydney',
  YMML: 'Melbourne',
  YBBN: 'Brisbane',
  YPPH: 'Perth',
  NZAA: 'Auckland',
  NZWN: 'Wellington',
  NZCH: 'Christchurch',
};

export function getAirportName(code: string | null | undefined): string | null {
  if (!code) return null;
  const upper = code.trim().toUpperCase();
  return KNOWN_AIRPORTS[upper] ?? null;
}

export function formatAirportDisplay(
  code: string | null | undefined,
  name: string | null | undefined,
  format: 'name' | 'both' | 'icao' = 'name'
): string | null {
  if (!code) return null;
  const c = code.trim().toUpperCase();
  const n = name?.trim() || getAirportName(c);
  if (format === 'both' && n) return `${c} (${n})`;
  if (format === 'icao' || !n) return c;
  return n;
}

export function getFlyingOver(lat: number | null, lon: number | null): string | null {
  const country = getCountry(lat, lon);
  return country ? `Flying over ${country}` : null;
}

export const SAFE_APPROACH_TEMPLATES = [
  'On Approach to {airport}',
  'On Final for {airport}',
  'Landing at {airport}',
  'Inbound to {airport}',
  'Arriving at {airport}',
  'Descending into {airport}',
] as const;

export function resolveSafeApproachTemplate(raw?: string | null): string {
  const trimmed = raw?.trim();
  if (trimmed && (SAFE_APPROACH_TEMPLATES as readonly string[]).includes(trimmed)) {
    return trimmed;
  }
  return 'On Approach to {airport}';
}

export function getSmartStatus(flight: FlightState | null, settings: Settings): string {
  if (!flight) return 'On Standby';
  const country = getCountry(flight.latitude, flight.longitude);
  const fl = flightLevel(flight.altitude);
  const phase = flight.phase?.toLowerCase() || '';

  const format = settings.airportFormat ?? 'name';
  const arrDisplay = formatAirportDisplay(flight.arrival, flight.arrivalName, format);
  const depDisplay = formatAirportDisplay(flight.departure, flight.departureName, format);

  // Post-flight ground states (use arrival airport)
  if (phase.includes('arrived at gate')) {
    return arrDisplay ? `Arrived at ${arrDisplay}` : 'Arrived at Gate';
  }
  if (phase.includes('taxiing to gate')) {
    return arrDisplay ? `Taxiing to Gate at ${arrDisplay}` : 'Taxiing to Gate';
  }
  if (phase.includes('landed')) {
    return arrDisplay ? `Landed at ${arrDisplay}` : 'Safely Landed';
  }
  // Approach and final approach
  if (phase.includes('short final')) {
    return arrDisplay ? `On Short Final for ${arrDisplay}` : 'On Short Final';
  }
  if (phase.includes('final approach')) {
    if (arrDisplay) {
      const template =
        !settings.approachTemplate?.trim() || settings.approachTemplate?.trim() === 'On Approach to {airport}'
          ? 'On Final for {airport}'
          : resolveSafeApproachTemplate(settings.approachTemplate);
      return template
        .replace('{airport}', arrDisplay)
        .replace('{city}', arrDisplay)
        .replace('{target}', arrDisplay);
    }
    return 'On Final Approach';
  }
  if (phase.includes('approach')) {
    if (arrDisplay) {
      const template = resolveSafeApproachTemplate(settings.approachTemplate);
      return template
        .replace('{airport}', arrDisplay)
        .replace('{city}', arrDisplay)
        .replace('{target}', arrDisplay);
    }
    return 'On Approach';
  }
  // Go-around
  if (phase.includes('go-around')) {
    return arrDisplay ? `Go-Around at ${arrDisplay}` : 'Go-Around';
  }
  // Descent
  if (phase.includes('descent') || phase.includes('descending')) {
    if (flight.distanceRemaining !== null && flight.distanceRemaining !== undefined && flight.distanceRemaining < 85.0) {
      if (arrDisplay) return `Descending into ${arrDisplay}${fl ? ` - ${fl}` : ''}`;
    }
    if (country) return `Descending over ${country}${fl ? ` - ${fl}` : ''}`;
    return arrDisplay ? `Descending into ${arrDisplay}${fl ? ` - ${fl}` : ''}` : `Descending${fl ? ` - ${fl}` : ''}`;
  }
  // Pre-flight ground states (use departure airport)
  if (phase.includes('takeoff roll')) {
    return depDisplay ? `Takeoff Roll at ${depDisplay}` : 'Takeoff Roll';
  }
  if (phase.includes('departing')) {
    return depDisplay ? `Departing ${depDisplay}` : 'Departing';
  }
  if (phase.includes('on gate')) {
    return depDisplay ? `At Gate - ${depDisplay}` : 'At Gate';
  }
  if (phase.includes('climb')) {
    if (flight.distanceDeparture !== null && flight.distanceDeparture !== undefined && flight.distanceDeparture < 45.0) {
      if (depDisplay) return `Climbing out of ${depDisplay}${fl ? ` - Passing ${fl}` : ''}`;
    }
    if (country) return `Climbing over ${country}${fl ? ` - Passing ${fl}` : ''}`;
    return depDisplay ? `Climbing out of ${depDisplay}${fl ? ` - Passing ${fl}` : ''}` : `Climbing${fl ? ` - Passing ${fl}` : ''}`;
  }
  if (phase.includes('cruise') || phase.includes('en route') || phase.includes('cruising')) {
    if (country) {
      const verb = country.startsWith('the ') ? 'Crossing' : 'Cruising over';
      return `${verb} ${country}${fl ? ` at ${fl}` : ''}`;
    }
    if (arrDisplay) return `En route to ${arrDisplay}${fl ? ` at ${fl}` : ''}`;
    return fl ? `Cruising at ${fl}` : 'En route';
  }
  // Generic pre-flight taxi (catches "Taxiing" but not "Taxiing to Gate" handled above)
  if (phase.includes('taxi') || phase.includes('preflight') || phase.includes('boarding') || phase.includes('pushing back')) {
    if (depDisplay) return `Taxiing at ${depDisplay}`;
    return 'Preparing for Departure';
  }
  if (country) {
    const verb = country.startsWith('the ') ? 'Crossing' : 'Flying over';
    return `${verb} ${country}${fl ? ` at ${fl}` : ''}`;
  }
  if (arrDisplay) return `In Flight to ${arrDisplay}${fl ? ` at ${fl}` : ''}`;
  return fl ? `In Flight at ${fl}` : 'In Flight';
}

export const ALLOWED_TEMPLATE_TOKENS = new Set([
  'callsign',
  'flying_as',
  'departure',
  'arrival',
  'departure_name',
  'departure_city',
  'arrival_name',
  'arrival_city',
  'approach_target',
  'aircraft',
  'aircraft_name',
  'altitude',
  'flight_level',
  'groundspeed',
  'heading',
  'frequency',
  'controller',
  'distance_remaining',
  'eta',
  'time_remaining',
  'flight_time',
  'phase',
  'route',
  'country',
  'flying_over',
  'smart_status',
  'airspace',
  'network',
]);

export function sanitizeTemplate(template: string): string {
  if (!template) return '';
  const parts = template.split(/(\{[a-zA-Z0-9_]+\})/g);
  let result = '';
  for (const part of parts) {
    if (part.startsWith('{') && part.endsWith('}')) {
      const token = part.slice(1, -1).toLowerCase();
      if (ALLOWED_TEMPLATE_TOKENS.has(token)) {
        result += `{${token}}`;
      }
    } else {
      const sanitizedLiteral = part
        .replace(/VATSIM/gi, '\u0001')
        .replace(/[^•→\-–—/|:,\s\u0001]/g, '')
        .replace(/\u0001/g, 'VATSIM');
      result += sanitizedLiteral;
    }
  }
  return result;
}

export function renderTemplate(template: string, flight: FlightState | null, settings: Settings): string {
  if (!flight) return '';
  const sanitized = sanitizeTemplate(template);
  const country = getCountry(flight.latitude, flight.longitude);
  const depName = flight.departureName || getAirportName(flight.departure);
  const arrName = flight.arrivalName || getAirportName(flight.arrival);
  const arrDisplay = formatAirportDisplay(flight.arrival, flight.arrivalName, settings.airportFormat ?? 'name');
  const values: Record<string, string | null> = {
    callsign: flight.callsign,
    flying_as: flight.callsign ? `Flying as ${flight.callsign} on VATSIM` : null,
    departure: flight.departure,
    arrival: flight.arrival,
    departure_name: depName,
    departure_city: depName,
    arrival_name: arrName,
    arrival_city: arrName,
    approach_target: arrDisplay,
    aircraft: flight.aircraft,
    aircraft_name: flight.aircraft,
    altitude: flight.altitude === null ? null : `${flight.altitude.toLocaleString()} ft`,
    flight_level: flightLevel(flight.altitude),
    groundspeed: flight.groundspeed === null ? null : `${flight.groundspeed} kt`,
    heading: flight.heading === null ? null : `${flight.heading}°`,
    frequency: flight.frequency,
    controller: null,
    distance_remaining: flight.distanceRemaining === null ? null : `${Math.round(flight.distanceRemaining)} NM`,
    eta: flight.eta,
    time_remaining: formatDuration(flight.timeRemaining),
    flight_time: flight.elapsedTime ? formatDuration(flight.elapsedTime) : null,
    phase: flight.phase,
    route: flight.route,
    country,
    flying_over: getFlyingOver(flight.latitude, flight.longitude),
    smart_status: getSmartStatus(flight, settings),
    airspace: country ? `${country} Airspace` : null,
    network: 'VATSIM',
  };
  const cleaned = sanitized.replace(/\{([a-z_]+)\}/g, (_, key: string) => values[key] ?? '');
  return cleaned
    .split('•')
    .map(part => part.trim().replace(/^\s*→\s*|\s*→\s*$/g, '').trim())
    .filter(Boolean)
    .join(' • ');
}

export function greatCircleDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radians = Math.PI / 180;
  const dLat = (lat2 - lat1) * radians;
  const dLon = (lon2 - lon1) * radians;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * radians) * Math.cos(lat2 * radians) * Math.sin(dLon / 2) ** 2;
  return 3440.065 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function getVatsimMapUrl(flight: FlightState | null, settings?: Settings): string {
  const settingsCid = settings?.cid?.trim();
  const cid = flight?.cid ?? (settingsCid && !Number.isNaN(Number(settingsCid)) ? Number(settingsCid) : null);
  if (cid && cid > 0) {
    return `https://vatsim.privatesearch.xyz/pilot/${cid}`;
  }
  if (flight?.callsign && flight.callsign.trim().length > 0) {
    return `https://vatsim.privatesearch.xyz/data/flights/${encodeURIComponent(flight.callsign.trim())}`;
  }
  return 'https://vatsim.privatesearch.xyz/';
}
