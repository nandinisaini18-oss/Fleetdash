import { useRef, useEffect, useState, useCallback, memo } from "react";
import CanvasRenderer from "../canvas/CanvasRenderer";
import { findVehicleAtMouse } from "../canvas/hitDetection";
import { getGeofences } from "../services/api";
import VehicleTooltip from "./VehicleTooltip";

const MemoizedTooltip = memo(VehicleTooltip);

function LiveMap({ bufferRef, vehicles }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const tooltipRef = useRef(null);
  const [geofenceError, setGeofenceError] = useState(null);
  const [tooltipState, setTooltipState] = useState({ vehicle: null, telemetry: null });
  const selectedIdRef = useRef(null);
  const lastHoveredIdRef = useRef(null);

  const vehiclesMapRef = useRef(new Map());
  useEffect(() => {
    const map = new Map();
    if (Array.isArray(vehicles)) {
      for (const v of vehicles) {
        map.set(v._id, v);
      }
    }
    vehiclesMapRef.current = map;
  }, [vehicles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new CanvasRenderer(canvas, bufferRef);
    rendererRef.current = renderer;

    getGeofences()
      .then((res) => {
        renderer.setGeofences(res.data || []);
      })
      .catch((err) => {
        setGeofenceError(err.message);
      });

    renderer.start();

    const resizeObserver = new ResizeObserver(() => {
      renderer.resize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      renderer.stop();
      rendererRef.current = null;
    };
  }, [bufferRef]);

  const getMousePos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      const renderer = rendererRef.current;
      if (!renderer) return;

      const { x, y } = getMousePos(e);
      const viewport = renderer.getViewport();
      if (!viewport) return;

      const buffer = bufferRef.current;
      const hitId = findVehicleAtMouse(
        buffer,
        viewport,
        renderer.width,
        renderer.height,
        x,
        y
      );

      renderer.setHoveredVehicle(hitId);

      if (tooltipRef.current) {
        tooltipRef.current.style.left = (e.clientX + 16) + "px";
        tooltipRef.current.style.top = (e.clientY - 8) + "px";
      }

      if (hitId !== lastHoveredIdRef.current) {
        lastHoveredIdRef.current = hitId;
        const vehicle = hitId ? vehiclesMapRef.current.get(hitId) || null : null;
        const telemetry = hitId ? bufferRef.current.get(hitId) || null : null;
        setTooltipState({ vehicle, telemetry });
      }

      canvasRef.current.style.cursor = hitId ? "pointer" : "default";
    },
    [bufferRef, getMousePos]
  );

  const handleClick = useCallback(
    (e) => {
      const renderer = rendererRef.current;
      if (!renderer) return;

      const { x, y } = getMousePos(e);
      const viewport = renderer.getViewport();
      if (!viewport) return;

      const buffer = bufferRef.current;
      const hitId = findVehicleAtMouse(
        buffer,
        viewport,
        renderer.width,
        renderer.height,
        x,
        y
      );

      const next = selectedIdRef.current === hitId ? null : hitId;
      selectedIdRef.current = next;
      renderer.setSelectedVehicle(next);

      const vehicle = next ? vehiclesMapRef.current.get(next) || null : null;
      const telemetry = next ? bufferRef.current.get(next) || null : null;
      setTooltipState({ vehicle, telemetry });
    },
    [bufferRef, getMousePos]
  );

  const handleMouseLeave = useCallback(() => {
    const renderer = rendererRef.current;
    if (renderer) {
      renderer.setHoveredVehicle(null);
    }
    lastHoveredIdRef.current = null;
    setTooltipState({ vehicle: null, telemetry: null });
    if (canvasRef.current) {
      canvasRef.current.style.cursor = "default";
    }
  }, []);

  const showTooltip = tooltipState.vehicle && tooltipState.telemetry;

  return (
    <div className="live-map" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="map-canvas"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={handleMouseLeave}
      />
      {geofenceError && (
        <div className="map-error-badge">Geofences: {geofenceError}</div>
      )}
      {showTooltip && (
        <div ref={tooltipRef} className="vehicle-tooltip" style={{ position: "fixed" }}>
          <MemoizedTooltip
            vehicle={tooltipState.vehicle}
            telemetry={tooltipState.telemetry}
          />
        </div>
      )}
    </div>
  );
}

export default LiveMap;
