/**
 * Approximate lat / long for every park & region in our catalogue.
 * Used by RouteMap to pin itineraries on an East Africa overview.
 *
 * Coords are rounded to 2 decimals — precise enough for the ~600px map
 * without pretending to be GIS-grade.
 */

export const PARK_COORDS = {
  // ── Tanzania ─────────────────────────────────────────────────────────────
  serengeti:      { lat: -2.33,  lng: 34.82, country: 'Tanzania' },
  ngorongoro:     { lat: -3.17,  lng: 35.58, country: 'Tanzania' },
  tarangire:      { lat: -3.83,  lng: 36.00, country: 'Tanzania' },
  lake_manyara:   { lat: -3.50,  lng: 35.83, country: 'Tanzania' },
  arusha:         { lat: -3.23,  lng: 36.83, country: 'Tanzania' },
  ruaha:          { lat: -7.70,  lng: 34.92, country: 'Tanzania' },
  nyerere:        { lat: -8.70,  lng: 37.60, country: 'Tanzania' },
  katavi:         { lat: -6.80,  lng: 31.30, country: 'Tanzania' },
  mahale:         { lat: -6.12,  lng: 29.75, country: 'Tanzania' },
  kilimanjaro:    { lat: -3.07,  lng: 37.35, country: 'Tanzania' },
  zanzibar:       { lat: -6.17,  lng: 39.19, country: 'Tanzania' },

  // ── Kenya ────────────────────────────────────────────────────────────────
  masai_mara:     { lat: -1.50,  lng: 35.00, country: 'Kenya' },
  amboseli:       { lat: -2.65,  lng: 37.25, country: 'Kenya' },
  tsavo_east:     { lat: -2.75,  lng: 38.83, country: 'Kenya' },
  tsavo_west:     { lat: -2.75,  lng: 37.90, country: 'Kenya' },
  samburu:        { lat:  0.60,  lng: 37.55, country: 'Kenya' },
  lake_nakuru:    { lat: -0.37,  lng: 36.08, country: 'Kenya' },
  meru:           { lat:  0.00,  lng: 38.00, country: 'Kenya' },

  // ── Uganda ───────────────────────────────────────────────────────────────
  bwindi:         { lat: -1.05,  lng: 29.67, country: 'Uganda' },
  queen_elizabeth:{ lat: -0.20,  lng: 30.03, country: 'Uganda' },
  murchison:      { lat:  2.17,  lng: 31.75, country: 'Uganda' },
  kibale:         { lat:  0.50,  lng: 30.38, country: 'Uganda' },
  mgahinga:       { lat: -1.37,  lng: 29.63, country: 'Uganda' },
  kidepo:         { lat:  3.92,  lng: 33.75, country: 'Uganda' },

  // ── Rwanda ───────────────────────────────────────────────────────────────
  volcanoes:      { lat: -1.47,  lng: 29.50, country: 'Rwanda' },
  akagera:        { lat: -1.68,  lng: 30.78, country: 'Rwanda' },
  nyungwe:        { lat: -2.45,  lng: 29.15, country: 'Rwanda' },
};

// Country label anchors (rough centroids for map legend placement).
export const COUNTRY_ANCHORS = [
  { name: 'Kenya',    lat:  0.50,  lng: 37.90 },
  { name: 'Tanzania', lat: -6.00,  lng: 35.00 },
  { name: 'Uganda',   lat:  1.50,  lng: 32.30 },
  { name: 'Rwanda',   lat: -2.00,  lng: 29.90 },
];

// Bounding box we render. Any coords outside this range get clamped so a
// mistyped entry can never escape the viewport.
export const MAP_BOUNDS = {
  minLat: -12,
  maxLat:  5,
  minLng:  28,
  maxLng:  42,
};

/** Match a freeform destination string to a known park id. */
export function guessParkId(destination) {
  if (!destination) return null;
  const q = String(destination).toLowerCase();
  for (const id of Object.keys(PARK_COORDS)) {
    const token = id.replace(/_/g, ' ');
    if (q.includes(token)) return id;
  }
  // Loose alias matches
  if (q.includes('selous')) return 'nyerere';
  if (q.includes('mara') && !q.includes('mahale')) return 'masai_mara';
  if (q.includes('crater')) return 'ngorongoro';
  if (q.includes('gorilla') && q.includes('rwanda')) return 'volcanoes';
  if (q.includes('gorilla')) return 'bwindi';
  return null;
}
