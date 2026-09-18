const GEOFENCE_COLORS = {
  active: {
    fill: "rgba(0, 255, 65, 0.1)",
    stroke: "rgba(0, 255, 65, 0.75)",
    label: "rgba(0, 255, 65, 0.85)",
  },
  inactive: {
    fill: "rgba(107, 114, 128, 0.07)",
    stroke: "rgba(107, 114, 128, 0.5)",
    label: "rgba(107, 114, 128, 0.65)",
  },
};

export function drawGeofences(ctx, geofences, map) {
  if (!geofences || geofences.length === 0 || !map) return;
  if (typeof map.latLngToContainerPoint !== "function") return;

  for (let i = 0; i < geofences.length; i++) {
    const geofence = geofences[i];
    if (!geofence || !Array.isArray(geofence.coordinates)) continue;
    // Backend convention: coordinates = [[[lng, lat], ...]] (GeoJSON rings).
    const ring = geofence.coordinates[0];
    if (!Array.isArray(ring) || ring.length < 3) continue;
    const validRing = ring.filter(
      (pt) =>
        Array.isArray(pt) &&
        Number.isFinite(pt[0]) &&
        Number.isFinite(pt[1])
    );
    if (validRing.length < 3) continue;

    const colors = geofence.status === "active" ? GEOFENCE_COLORS.active : GEOFENCE_COLORS.inactive;
    const firstPoint = map.latLngToContainerPoint([validRing[0][1], validRing[0][0]]);

    ctx.beginPath();
    ctx.moveTo(firstPoint.x, firstPoint.y);

    for (let j = 1; j < validRing.length; j++) {
      const point = map.latLngToContainerPoint([validRing[j][1], validRing[j][0]]);
      ctx.lineTo(point.x, point.y);
    }

    ctx.closePath();
    ctx.fillStyle = colors.fill;
    ctx.fill();

    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([10, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = '600 10px "Fira Code", monospace';
    ctx.fillStyle = colors.label;
    if (typeof geofence.name === "string" && geofence.name.length > 0) {
      ctx.fillText(geofence.name.toUpperCase(), firstPoint.x + 6, firstPoint.y - 6);
    }
  }
}
