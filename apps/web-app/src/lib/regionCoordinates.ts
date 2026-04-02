/**
 * Maps the 23 region names from the dataset's regionCounts
 * to approximate geographic center coordinates [lat, lng].
 * Also includes a base risk weight for visual styling.
 */

export interface RegionGeo {
  lat: number;
  lng: number;
  riskWeight: number; // 0–1, higher = visually more dangerous
}

export const REGION_COORDINATES: Record<string, RegionGeo> = {
  'Central America':  { lat: 15.0,   lng: -86.0,   riskWeight: 0.7  },
  'South America':    { lat: -15.0,  lng: -60.0,   riskWeight: 0.55 },
  'Caribbean':        { lat: 18.0,   lng: -72.0,   riskWeight: 0.45 },
  'Northern Europe':  { lat: 60.0,   lng: 15.0,    riskWeight: 0.2  },
  'Western Europe':   { lat: 48.5,   lng: 3.0,     riskWeight: 0.3  },
  'Southern Europe':  { lat: 40.0,   lng: 15.0,    riskWeight: 0.35 },
  'Eastern Europe':   { lat: 50.0,   lng: 30.0,    riskWeight: 0.4  },
  'Eastern Asia':     { lat: 35.0,   lng: 115.0,   riskWeight: 0.3  },
  'Southeast Asia':   { lat: 5.0,    lng: 110.0,   riskWeight: 0.5  },
  'South Asia':       { lat: 22.0,   lng: 78.0,    riskWeight: 0.45 },
  'Central Asia':     { lat: 42.0,   lng: 65.0,    riskWeight: 0.35 },
  'West Asia':        { lat: 30.0,   lng: 45.0,    riskWeight: 0.5  },
  'Oceania':          { lat: -25.0,  lng: 135.0,   riskWeight: 0.2  },
  'South of  USA':    { lat: 30.0,   lng: -90.0,   riskWeight: 0.3  },
  'West of USA':      { lat: 37.0,   lng: -120.0,  riskWeight: 0.25 },
  'US Center':        { lat: 39.0,   lng: -98.0,   riskWeight: 0.2  },
  'East of USA':      { lat: 38.0,   lng: -78.0,   riskWeight: 0.25 },
  'Canada':           { lat: 55.0,   lng: -105.0,  riskWeight: 0.15 },
  'Central Africa':   { lat: 2.0,    lng: 20.0,    riskWeight: 0.65 },
  'North Africa':     { lat: 28.0,   lng: 5.0,     riskWeight: 0.5  },
  'West Africa':      { lat: 8.0,    lng: -5.0,    riskWeight: 0.6  },
  'East Africa':      { lat: 0.0,    lng: 37.0,    riskWeight: 0.55 },
  'Southern Africa':  { lat: -28.0,  lng: 25.0,    riskWeight: 0.4  },
};

/**
 * Maps common city names to approximate lat/lng for shipment markers.
 * Used for the live telemetry map origin/destination dots.
 */
export const CITY_COORDINATES: Record<string, [number, number]> = {
  // Americas
  'Mexico City':     [19.43, -99.13],
  'Dos Quebradas':   [4.83, -75.67],
  'Chicago':         [41.88, -87.63],
  'San Antonio':     [29.42, -98.49],
  'New York':        [40.71, -74.01],
  'Los Angeles':     [34.05, -118.24],
  'Houston':         [29.76, -95.37],
  'Miami':           [25.76, -80.19],
  'São Paulo':       [-23.55, -46.63],
  'Buenos Aires':    [-34.60, -58.38],
  'Lima':            [-12.05, -77.04],
  'Bogotá':          [4.71, -74.07],
  'Santiago':        [-33.45, -70.67],
  'Toronto':         [43.65, -79.38],
  'Vancouver':       [49.28, -123.12],
  // Europe
  'London':          [51.51, -0.13],
  'Paris':           [48.86, 2.35],
  'Madrid':          [40.42, -3.70],
  'Berlin':          [52.52, 13.40],
  'Roma':            [41.90, 12.50],
  'Amsterdam':       [52.37, 4.90],
  'Stockholm':       [59.33, 18.07],
  'Moscú':           [55.76, 37.62],
  // Asia & Pacific
  'Tokio':           [35.68, 139.69],
  'Shanghái':        [31.23, 121.47],
  'Mumbai':          [19.08, 72.88],
  'Sídney':          [-33.87, 151.21],
  'Singapur':        [1.35, 103.82],
  'Dubái':           [25.20, 55.27],
  'Hong Kong':       [22.32, 114.17],
  'Bangkok':         [13.76, 100.50],
  // Africa
  'Lagos':           [6.52, 3.38],
  'Nairobi':         [-1.29, 36.82],
  'El Cairo':        [30.04, 31.24],
  'Johannesburgo':   [-26.20, 28.05],
  'Casablanca':      [33.57, -7.59],
  // Generic fallbacks
  'Hickory':         [35.73, -81.34],
  'Columbus':        [39.96, -82.99],
  'Springfield':     [39.78, -89.65],
  'Jacksonville':    [30.33, -81.66],
  'Philadelphia':    [39.95, -75.17],
  'San Francisco':   [37.77, -122.42],
  'Phoenix':         [33.45, -112.07],
  'Dallas':          [32.78, -96.80],
  'Seattle':         [47.61, -122.33],
  'Denver':          [39.74, -104.99],
  'Atlanta':         [33.75, -84.39],
  'San José':        [9.93, -84.08],
  'Portland':        [45.51, -122.68],
  'Nashville':       [36.16, -86.78],
  'Charlotte':       [35.23, -80.84],
};

/**
 * Attempt to find coordinates for a city string like "Mexico City, México"
 */
export function getCityCoords(cityString: string): [number, number] | null {
  if (!cityString) return null;
  const city = cityString.split(',')[0].trim();
  if (CITY_COORDINATES[city]) return CITY_COORDINATES[city];

  // Fuzzy match: check if any key starts with the city name
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (city.toLowerCase().startsWith(key.toLowerCase()) ||
        key.toLowerCase().startsWith(city.toLowerCase())) {
      return coords;
    }
  }
  return null;
}

/**
 * Get risk color based on a 0–1 score
 */
export function getRiskColor(score: number): string {
  if (score > 0.7) return '#ef4444'; // red
  if (score > 0.4) return '#f59e0b'; // amber
  if (score > 0.2) return '#f97316'; // orange
  return '#22c55e';                   // green
}

/**
 * Get risk color as HSL for gradient effects
 */
export function getRiskHSL(score: number): string {
  // Maps 0..1 to hue 120 (green) → 0 (red)
  const hue = Math.round((1 - score) * 120);
  return `hsl(${hue}, 85%, 55%)`;
}
