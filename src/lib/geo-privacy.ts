/**
 * Never show a seller's exact coordinates on a public listing — this derives
 * a rough, "somewhere near here" point instead. The offset is deterministic
 * (hashed from `seed`, typically the business id) so the same business
 * always shows the same approximate spot rather than jittering on every
 * page load, without ever needing to persist a second pair of coordinates.
 *
 * Callers must run this server-side, on the real lat/lng, and only ever
 * send the *result* to the client — the point is that the true coordinates
 * never reach the browser for this feature.
 */
export function approximateLocation(
  lat: number,
  lng: number,
  seed: string
): { lat: number; lng: number } {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  // Two pseudo-random unit values in [-1, 1] from the same hash, decorrelated
  // by mixing in different constants before re-hashing.
  const a = Math.sin(hash) * 10000
  const b = Math.sin(hash * 1.2345 + 1) * 10000
  const jitterLat = ((a - Math.floor(a)) * 2 - 1) * 0.015 // ~±1.6km of latitude
  const jitterLng = ((b - Math.floor(b)) * 2 - 1) * 0.015

  return {
    lat: Math.round((lat + jitterLat) * 1000) / 1000,
    lng: Math.round((lng + jitterLng) * 1000) / 1000,
  }
}
