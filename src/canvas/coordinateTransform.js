export function createViewport() {
  return null;
}

export function lngToX(lng, map) {
  const point = map.latLngToContainerPoint([0, lng]);
  return point.x;
}

export function latToY(lat, map) {
  const point = map.latLngToContainerPoint([lat, 0]);
  return point.y;
}

export function toCanvasCoords(latitude, longitude, map) {
  const point = map.latLngToContainerPoint([latitude, longitude]);
  return { x: point.x, y: point.y };
}
