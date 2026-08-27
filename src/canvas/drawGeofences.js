import { lngToX, latToY } from "./coordinateTransform";

const GEOFENCE_COLORS = {
  active: {
    fill: "rgba(0, 255, 65, 0.06)",
    stroke: "rgba(0, 255, 65, 0.35)",
  },
  inactive: {
    fill: "rgba(107, 114, 128, 0.04)",
    stroke: "rgba(107, 114, 128, 0.2)",
  },
};

export function drawGeofences(ctx, geofences, viewport, canvasWidth, canvasHeight, dpr) {
  if (!geofences || geofences.length === 0) return;

  const lineWidth = 1.5 * dpr;

  for (let i = 0; i < geofences.length; i++) {
    const geofence = geofences[i];
    const ring = geofence.coordinates[0];
    if (!ring || ring.length < 3) continue;

    const colors = geofence.status === "active" ? GEOFENCE_COLORS.active : GEOFENCE_COLORS.inactive;

    ctx.beginPath();

    const firstX = lngToX(ring[0][0], viewport, canvasWidth);
    const firstY = latToY(ring[0][1], viewport, canvasHeight);
    ctx.moveTo(firstX, firstY);

    for (let j = 1; j < ring.length; j++) {
      const px = lngToX(ring[j][0], viewport, canvasWidth);
      const py = latToY(ring[j][1], viewport, canvasHeight);
      ctx.lineTo(px, py);
    }

    ctx.closePath();

    ctx.fillStyle = colors.fill;
    ctx.fill();

    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([6 * dpr, 4 * dpr]);
    ctx.stroke();
    ctx.setLineDash([]);

    const centerX = lngToX(ring[0][0], viewport, canvasWidth);
    const centerY = latToY(ring[0][1], viewport, canvasHeight);

    ctx.font = `${10 * dpr}px "Fira Code", monospace`;
    ctx.fillStyle = colors.stroke;
    ctx.fillText(geofence.name, centerX + 4 * dpr, centerY - 4 * dpr);
  }
}
