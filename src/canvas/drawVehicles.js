const VEHICLE_RADIUS = 7;
const HEADING_LINE_LENGTH = 14;
const STALE_THRESHOLD_MS = 30000;
const DEG_TO_RAD = Math.PI / 180;

const ACTIVE_COLOR = "#00FF41";
const STALE_COLOR = "#6B7280";
const HEADING_COLOR = "#FFFFFF";
const GLOW_COLOR = "rgba(0, 255, 65, 0.35)";
const OUTER_RING = "rgba(0, 255, 65, 0.15)";

export function drawVehicles(ctx, buffer, map, canvasWidth, canvasHeight) {
  if (!map || typeof map.latLngToContainerPoint !== "function") return;
  if (!buffer || buffer.size === 0) return;
  const now = Date.now();
  const radius = VEHICLE_RADIUS;
  const headingLen = HEADING_LINE_LENGTH;
  const glowRadius = radius * 3;

  ctx.lineWidth = 2;

  buffer.forEach((telemetry) => {
    if (
      !telemetry ||
      !Number.isFinite(telemetry.latitude) ||
      !Number.isFinite(telemetry.longitude)
    ) {
      return;
    }
    const point = map.latLngToContainerPoint([telemetry.latitude, telemetry.longitude]);
    const x = point.x;
    const y = point.y;
    if (x < -40 || x > canvasWidth + 40 || y < -40 || y > canvasHeight + 40) return;

    const age = now - (typeof telemetry.timestampMs === "number"
      ? telemetry.timestampMs
      : new Date(telemetry.timestamp).getTime());
    const isStale = age > STALE_THRESHOLD_MS;

    if (!isStale) {
      ctx.beginPath();
      ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = GLOW_COLOR;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = OUTER_RING;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.lineWidth = 2;
    }

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = isStale ? STALE_COLOR : ACTIVE_COLOR;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fillStyle = "#0D1117";
    ctx.fill();

    const headingRad = telemetry.heading * DEG_TO_RAD;
    const hx = x + Math.sin(headingRad) * headingLen;
    const hy = y - Math.cos(headingRad) * headingLen;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(hx, hy);
    ctx.strokeStyle = isStale ? "rgba(255,255,255,0.3)" : HEADING_COLOR;
    ctx.globalAlpha = 0.7;
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  });
}
