import { toCanvasCoords } from "./coordinateTransform";
import { drawVehicles, preloadVehicleIcon } from "./drawVehicles";
import { drawGeofences } from "./drawGeofences";

// Selection/hover ring radii sized to enclose the vehicle icon
// (34px tall van image, half-diagonal ~19px) rather than the old 7px dot.
const SELECTED_RING_RADIUS = 24;
const HOVERED_RING_RADIUS = 20;

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
    this.map = null;
    // Start loading the vehicle icon early so the first frames can draw it.
    preloadVehicleIcon();
  }

  setMap(map) {
    this.map = map;
  }

  setHoveredVehicle(vehicleId) {
    this.hoveredVehicleId = vehicleId;
  }

  setSelectedVehicle(vehicleId) {
    this.selectedVehicleId = vehicleId;
  }

  setGeofences(geofences) {
    this.geofences = geofences;
  }

  resize() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    if (!rect || rect.width < 2 || rect.height < 2) return;
    const nextWidth = Math.floor(rect.width);
    const nextHeight = Math.floor(rect.height);
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
    // Idempotent: resetting canvas.width clears the bitmap. During a
    // selection flyTo, Leaflet fires move/zoom on every animation frame, so
    // an unconditional reset would blank vehicles/geofences for the whole
    // flight. Only reset the backing store when the size actually changed;
    // per-frame position sync is handled by the rAF render loop.
    if (
      nextWidth === this.width &&
      nextHeight === this.height &&
      nextDpr === this.dpr
    ) {
      return;
    }
    this.width = nextWidth;
    this.height = nextHeight;
    this.dpr = nextDpr;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + "px";
    this.canvas.style.height = this.height + "px";
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  drawEmptyState() {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2;

    ctx.font = '14px "Fira Sans", sans-serif';
    ctx.fillStyle = "rgba(139, 148, 158, 0.7)";
    ctx.textAlign = "center";
    ctx.fillText("No live vehicle data", cx, cy - 10);

    ctx.font = '11px "Fira Code", monospace';
    ctx.fillStyle = "rgba(139, 148, 158, 0.4)";
    ctx.fillText("Waiting for telemetry events...", cx, cy + 14);
  }

  render() {
    const map = this.map;
    if (!map || !this.canvas || !this.ctx) return;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const buffer = this.bufferRef.current;
    const vehicleCount = buffer.size;

    drawGeofences(ctx, this.geofences, this.map);

    if (vehicleCount > 0) {
      drawVehicles(ctx, buffer, this.map, this.width, this.height);
      this.drawSelectionRing(ctx, buffer);
    } else {
      this.drawEmptyState();
    }
  }

  drawSelectionRing(ctx, buffer) {
    const targetId = this.selectedVehicleId || this.hoveredVehicleId;
    if (!targetId || !this.map) return;

    const telemetry = buffer.get(targetId);
    if (!telemetry) return;

    const { x, y } = toCanvasCoords(telemetry.latitude, telemetry.longitude, this.map);

    const isSelected = targetId === this.selectedVehicleId;
    const ringRadius = isSelected ? SELECTED_RING_RADIUS : HOVERED_RING_RADIUS;

    ctx.beginPath();
    ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = isSelected ? "#00FF41" : "rgba(0, 255, 65, 0.5)";
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.stroke();

    if (isSelected) {
      ctx.beginPath();
      ctx.arc(x, y, ringRadius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 255, 65, 0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  loop = () => {
    if (!this.running) return;
    // Schedule the next frame BEFORE rendering so a single bad frame
    // (e.g. map torn down mid-frame) can never permanently kill the loop.
    this.animationId = requestAnimationFrame(this.loop);
    this.render();
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

  dispose() {
    this.stop();
    // Detach the Leaflet instance so no further coordinate conversion
    // can run against a removed/unmounted map.
    this.map = null;
  }
}
