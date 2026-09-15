const INTERACTION_RADIUS = 12;
const INTERACTION_RADIUS_SQ = INTERACTION_RADIUS * INTERACTION_RADIUS;

export function findVehicleAtMouse(buffer, map, mouseX, mouseY) {
  if (!buffer || buffer.size === 0) return null;
  if (!map || typeof map.latLngToContainerPoint !== "function") return null;
  let closestId = null;
  let closestDistSq = Infinity;

  buffer.forEach((telemetry, vehicleId) => {
    if (
      !telemetry ||
      !Number.isFinite(telemetry.latitude) ||
      !Number.isFinite(telemetry.longitude)
    ) {
      return;
    }
    const point = map.latLngToContainerPoint([telemetry.latitude, telemetry.longitude]);

    const dx = mouseX - point.x;
    const dy = mouseY - point.y;
    const distSq = dx * dx + dy * dy;

    if (distSq < INTERACTION_RADIUS_SQ && distSq < closestDistSq) {
      closestDistSq = distSq;
      closestId = vehicleId;
    }
  });

  return closestId;
}
