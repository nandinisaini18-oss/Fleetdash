const INTERACTION_RADIUS = 12;
const INTERACTION_RADIUS_SQ = INTERACTION_RADIUS * INTERACTION_RADIUS;
const PADDING = 40;

export function findVehicleAtMouse(buffer, viewport, canvasWidth, canvasHeight, mouseX, mouseY) {
  let closestId = null;
  let closestDistSq = Infinity;

  const { minLng, maxLng, minLat, maxLat } = viewport;
  const lngRange = maxLng - minLng || 1;
  const latRange = maxLat - minLat || 1;
  const xScale = (canvasWidth - 2 * PADDING) / lngRange;
  const yScale = (canvasHeight - 2 * PADDING) / latRange;

  buffer.forEach((telemetry, vehicleId) => {
    const x = PADDING + (telemetry.longitude - minLng) * xScale;
    const y = PADDING + (maxLat - telemetry.latitude) * yScale;

    const dx = mouseX - x;
    const dy = mouseY - y;
    const distSq = dx * dx + dy * dy;

    if (distSq < INTERACTION_RADIUS_SQ && distSq < closestDistSq) {
      closestDistSq = distSq;
      closestId = vehicleId;
    }
  });

  return closestId;
}
