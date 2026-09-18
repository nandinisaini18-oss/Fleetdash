// Single place for geofence coordinate conversion.
//
// Backend contract (GeoJSON order, never change):
//   coordinates: [[[lng, lat], ...]] with the ring closed by repeating
//   the first coordinate at the end.
// Leaflet works with { lat, lng } / [lat, lng] pairs.

export function backendRingToCorners(geofence) {
  const ring = geofence?.coordinates?.[0];
  if (!Array.isArray(ring)) return [];
  const corners = ring
    .filter((pt) => Array.isArray(pt) && Number.isFinite(pt[0]) && Number.isFinite(pt[1]))
    .map((pt) => ({ lat: pt[1], lng: pt[0] }));
  // Drop the closing duplicate so editing works with exactly 4 corners.
  if (
    corners.length > 1 &&
    corners[0].lat === corners[corners.length - 1].lat &&
    corners[0].lng === corners[corners.length - 1].lng
  ) {
    corners.pop();
  }
  return corners;
}

export function cornersToBackend(corners) {
  const ring = corners.map((c) => [c.lng, c.lat]);
  if (ring.length > 0) ring.push([corners[0].lng, corners[0].lat]);
  return [ring];
}

export function countCorners(geofence) {
  return backendRingToCorners(geofence).length;
}
