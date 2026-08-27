import { createViewport, toCanvasCoords } from "./coordinateTransform";
import { drawVehicles } from "./drawVehicles";
import { drawGeofences } from "./drawGeofences";

const GRID_COLOR = "rgba(48, 54, 61, 0.5)";
const BG_COLOR = "#0D1117";

export default class CanvasRenderer {
  constructor(canvas, bufferRef) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.bufferRef = bufferRef;
    this.geofences = [];
    this.animationId = null;
    this.dpr = window.devicePixelRatio || 1;
    this.width = 0;
    this.height = 0;
    this.running = false;
    this.hoveredVehicleId = null;
    this.selectedVehicleId = null;

    this._viewport = null;
    this._viewportBufferVersion = -1;
    this._viewportGeofenceVersion = 0;
    this._viewportWidth = 0;
    this._viewportHeight = 0;

    this._geofenceCache = null;
    this._geofenceCacheVersion = 0;
    this._geofenceCacheViewportKey = "";
  }

  setHoveredVehicle(vehicleId) {
    this.hoveredVehicleId = vehicleId;
  }

  setSelectedVehicle(vehicleId) {
    this.selectedVehicleId = vehicleId;
  }

  getViewport() {
    return this._viewport;
  }

  setGeofences(geofences) {
    this.geofences = geofences;
    this._geofenceCacheVersion++;
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + "px";
    this.canvas.style.height = this.height + "px";
    this._viewportWidth = this.width;
    this._viewportHeight = this.height;
    this._viewportBufferVersion = -1;
  }

  _getViewport(buffer) {
    const bufferSize = buffer.size;
    if (
      this._viewport &&
      this._viewportBufferVersion === bufferSize &&
      this._viewportGeofenceVersion === this._geofenceCacheVersion &&
      this._viewportWidth === this.width &&
      this._viewportHeight === this.height
    ) {
      return this._viewport;
    }
    this._viewport = createViewport(this.width, this.height, this.geofences, buffer);
    this._viewportBufferVersion = bufferSize;
    this._viewportGeofenceVersion = this._geofenceCacheVersion;
    this._viewportWidth = this.width;
    this._viewportHeight = this.height;
    return this._viewport;
  }

  drawGrid() {
    const ctx = this.ctx;
    const dpr = this.dpr;
    const step = 50 * dpr;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.beginPath();
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.5 * dpr;

    for (let x = 0; x < w; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }

    for (let y = 0; y < h; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }

    ctx.stroke();
  }

  drawEmptyState() {
    const ctx = this.ctx;
    const dpr = this.dpr;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    ctx.font = `${14 * dpr}px "Fira Sans", sans-serif`;
    ctx.fillStyle = "rgba(139, 148, 158, 0.5)";
    ctx.textAlign = "center";
    ctx.fillText("No live vehicle data", cx, cy - 10 * dpr);

    ctx.font = `${11 * dpr}px "Fira Code", monospace`;
    ctx.fillStyle = "rgba(139, 148, 158, 0.3)";
    ctx.fillText("Waiting for telemetry events...", cx, cy + 14 * dpr);
  }

  render() {
    const ctx = this.ctx;
    const dpr = this.dpr;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawGrid();

    const buffer = this.bufferRef.current;
    const vehicleCount = buffer.size;

    const viewport = this._getViewport(buffer);
    this._viewport = viewport;

    drawGeofences(ctx, this.geofences, viewport, this.canvas.width, this.canvas.height, dpr);

    if (vehicleCount > 0) {
      drawVehicles(ctx, buffer, viewport, this.canvas.width, this.canvas.height, dpr);
      this.drawSelectionRing(ctx, buffer, viewport, dpr);
    } else {
      this.drawEmptyState();
    }
  }

  drawSelectionRing(ctx, buffer, viewport, dpr) {
    const targetId = this.selectedVehicleId || this.hoveredVehicleId;
    if (!targetId) return;

    const telemetry = buffer.get(targetId);
    if (!telemetry) return;

    const { x, y } = toCanvasCoords(
      telemetry.latitude,
      telemetry.longitude,
      viewport,
      this.canvas.width,
      this.canvas.height
    );

    const isSelected = targetId === this.selectedVehicleId;
    const ringRadius = 12 * dpr;

    ctx.beginPath();
    ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = isSelected ? "#00FF41" : "rgba(0, 255, 65, 0.6)";
    ctx.lineWidth = 2 * dpr;
    ctx.stroke();

    if (isSelected) {
      ctx.beginPath();
      ctx.arc(x, y, ringRadius + 4 * dpr, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 255, 65, 0.25)";
      ctx.lineWidth = 1 * dpr;
      ctx.stroke();
    }
  }

  loop = () => {
    if (!this.running) return;
    this.render();
    this.animationId = requestAnimationFrame(this.loop);
  };

  start() {
    if (this.running) return;
    this.running = true;
    this.resize();
    this.animationId = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}
