const STALE_THRESHOLD_MS = 30000;
const DEG_TO_RAD = Math.PI / 180;

// Display height (CSS px) for the top-view van icon. Width is derived from
// the loaded image's natural aspect ratio so the asset is never distorted.
// The provided asset (289x531) faces NORTH/TOP by default.
const ICON_HEIGHT = 34;
const VEHICLE_ICON_SRC = "/vehicle.png";

// Culling margin so icons sliding in/out at the viewport edge still draw.
const CULL_MARGIN = 40;

// Fallback dot style, used only while the icon image is still loading so
// markers are never blank. Matches the previous marker palette.
const FALLBACK_RADIUS = 7;
const ACTIVE_COLOR = "#00FF41";
const STALE_COLOR = "#6B7280";
const GLOW_COLOR = "rgba(0, 255, 65, 0.35)";
const OUTER_RING = "rgba(0, 255, 65, 0.15)";

// Singleton cache: one Image object for the app lifetime. Never created per
// frame; created once on first use (and eagerly from CanvasRenderer).
let cachedVehicleImage = null;

export function preloadVehicleIcon() {
  if (cachedVehicleImage || typeof Image === "undefined") return cachedVehicleImage;
  cachedVehicleImage = new Image();
  cachedVehicleImage.src = VEHICLE_ICON_SRC;
  return cachedVehicleImage;
}

function getVehicleImage() {
  if (!cachedVehicleImage && typeof Image !== "undefined") {
    cachedVehicleImage = new Image();
    cachedVehicleImage.src = VEHICLE_ICON_SRC;
  }
  return cachedVehicleImage;
}

function isImageReady(img) {
  return !!img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
}

function normalizeHeading(heading) {
  if (!Number.isFinite(heading)) return 0;
  return (((heading % 360) + 360) % 360) * DEG_TO_RAD;
}

function isStaleTelemetry(telemetry, now) {
  const timestampMs =
    typeof telemetry.timestampMs === "number"
      ? telemetry.timestampMs
      : new Date(telemetry.timestamp).getTime();
  return now - timestampMs > STALE_THRESHOLD_MS;
}

function drawFallbackDot(ctx, x, y, isStale) {
  const radius = FALLBACK_RADIUS;
  if (!isStale) {
    ctx.beginPath();
    ctx.arc(x, y, radius * 3, 0, Math.PI * 2);
    ctx.fillStyle = GLOW_COLOR;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = OUTER_RING;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = isStale ? STALE_COLOR : ACTIVE_COLOR;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, 2, 0, Math.PI * 2);
  ctx.fillStyle = "#0D1117";
  ctx.fill();
}

export function drawVehicles(ctx, buffer, map, canvasWidth, canvasHeight) {
  if (!map || typeof map.latLngToContainerPoint !== "function") return;
  if (!buffer || buffer.size === 0) return;
  const now = Date.now();
  const img = getVehicleImage();
  const imageReady = isImageReady(img);

  buffer.forEach((telemetry) => {
    if (
      !telemetry ||
      !Number.isFinite(telemetry.latitude) ||
      !Number.isFinite(telemetry.longitude)
    ) {
      return;
    }
    // Same screen coordinate as hitDetection + toCanvasCoords + selection
    // ring: Leaflet container point for the live GPS fix.
    const point = map.latLngToContainerPoint([telemetry.latitude, telemetry.longitude]);
    const x = point.x;
    const y = point.y;
    if (x < -CULL_MARGIN || x > canvasWidth + CULL_MARGIN || y < -CULL_MARGIN || y > canvasHeight + CULL_MARGIN) return;

    const isStale = isStaleTelemetry(telemetry, now);

    if (!imageReady) {
      drawFallbackDot(ctx, x, y, isStale);
      return;
    }

    const aspect = img.naturalWidth / img.naturalHeight;
    const h = ICON_HEIGHT;
    const w = h * aspect;

    if (!isStale) {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(w, h) * 0.62, 0, Math.PI * 2);
      ctx.fillStyle = GLOW_COLOR;
      ctx.fill();
    }

    // Rotate only the icon around its own center. Heading 0 = facing
    // up/north (asset default); positive canvas rotation is clockwise, so
    // 90deg faces right/east, 180 south, 270 west. Map itself never rotates.
    const headingRad = normalizeHeading(telemetry.heading);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(headingRad);
    if (isStale) ctx.globalAlpha = 0.55;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
    ctx.globalAlpha = 1.0;
  });
}
