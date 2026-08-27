const VEHICLE_RADIUS = 5;
const HEADING_LINE_LENGTH = 10;
const STALE_THRESHOLD_MS = 30000;
const DEG_TO_RAD = Math.PI / 180;

const ACTIVE_COLOR = "#00FF41";
const STALE_COLOR = "#6B7280";
const HEADING_COLOR = "#FFFFFF";
const GLOW_COLOR = "rgba(0, 255, 65, 0.3)";
const CENTER_COLOR = "#0D1117";

export function drawVehicles(ctx, buffer, viewport, canvasWidth, canvasHeight, dpr) {
  const now = Date.now();
  const radius = VEHICLE_RADIUS * dpr;
  const headingLen = HEADING_LINE_LENGTH * dpr;
  const glowRadius = radius * 2.5;
  const centerRadius = radius * 0.4;

  ctx.lineWidth = 1.5 * dpr;

  buffer.forEach((telemetry) => {
    const x = PADDING + ((telemetry.longitude - viewport.minLng) / (viewport.maxLng - viewport.minLng)) * (canvasWidth - 2 * PADDING);
    const y = PADDING + ((viewport.maxLat - telemetry.latitude) / (viewport.maxLat - viewport.minLat)) * (canvasHeight - 2 * PADDING);

    const age = now - new Date(telemetry.timestamp).getTime();
    const isStale = age > STALE_THRESHOLD_MS;

    if (!isStale) {
      ctx.beginPath();
      ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = GLOW_COLOR;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = isStale ? STALE_COLOR : ACTIVE_COLOR;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, centerRadius, 0, Math.PI * 2);
    ctx.fillStyle = CENTER_COLOR;
    ctx.fill();

    const headingRad = telemetry.heading * DEG_TO_RAD;
    const hx = x + Math.sin(headingRad) * headingLen;
    const hy = y - Math.cos(headingRad) * headingLen;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(hx, hy);
    ctx.strokeStyle = HEADING_COLOR;
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  });
}

const PADDING = 40;
