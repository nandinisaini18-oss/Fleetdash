import { useRef, useEffect, useState, useCallback, memo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import CanvasRenderer from "../canvas/CanvasRenderer";
import { findVehicleAtMouse } from "../canvas/hitDetection";
import { getGeofences } from "../services/api";
import VehicleTooltip from "./VehicleTooltip";
import VehicleDetails from "./VehicleDetails";
import AlertCenter from "./AlertCenter";

const MemoizedTooltip = memo(VehicleTooltip);

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const DEFAULT_CENTER = [22.72, 75.86];
const DEFAULT_ZOOM = 13;
const FLY_MIN_ZOOM = 14;
const FLY_MAX_ZOOM = 16;
const SELECTED_POLL_MS = 500;
const CARD_OFFSET_X = 18;
const CARD_OFFSET_Y = -20;
const CARD_WIDTH = 280;
const CARD_HEIGHT_EST = 340;

function targetZoomForSelection(map) {
  const current = map.getZoom();
  if (current < FLY_MIN_ZOOM) return FLY_MIN_ZOOM;
  if (current > FLY_MAX_ZOOM) return FLY_MAX_ZOOM;
  return current;
}

function LiveMap({
  bufferRef,
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  alerts,
  onDismissAlert,
  alertHistory,
  onAlertClick,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const mapRef = useRef(null);
  const fittedRef = useRef(false);
  const userInteractedRef = useRef(false);
  const programmaticMoveRef = useRef(false);
  const hoverRafRef = useRef(0);
  const [geofenceError, setGeofenceError] = useState(null);
  const [tooltipState, setTooltipState] = useState({ vehicle: null, telemetry: null, x: 0, y: 0 });
  const selectedIdRef = useRef(null);
  const lastHoveredIdRef = useRef(null);
  const lastFlownIdRef = useRef(null);
  const [showAlertHistory, setShowAlertHistory] = useState(false);
  const [selectedTelemetry, setSelectedTelemetry] = useState(null);
  const [detailStyle, setDetailStyle] = useState(null);
  const [mapVersion, setMapVersion] = useState(0);
  // Flips false -> true once when live telemetry first lands in the buffer.
  // Boolean transition only: never set per telemetry packet.
  const [telemetryAvailable, setTelemetryAvailable] = useState(false);
  const displayedTelemetry = selectedVehicleId ? selectedTelemetry : null;

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

  // Initialize Leaflet + Canvas
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    let alive = true;

    const map = L.map(container, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTR,
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    const canvas = canvasRef.current;
    const renderer = new CanvasRenderer(canvas, bufferRef);
    renderer.setMap(map);
    rendererRef.current = renderer;

    map.whenReady(() => {
      // The map may have been removed before it became ready (StrictMode
      // remount, fast unmount). Never start rendering against a dead map.
      if (!alive || mapRef.current !== map) return;
      renderer.resize();
      renderer.start();
    });

    // Keep canvas sized/aligned to the Leaflet container on every view change
    // so vehicles stay visible while panning/zooming (rAF redraws each frame).
    const syncOverlay = () => {
      if (!alive || mapRef.current !== map) return;
      map.invalidateSize({ animate: false });
      renderer.resize();
    };
    const bumpVersion = () => {
      if (!alive) return;
      setMapVersion((v) => v + 1);
    };
    const syncAndBump = () => {
      if (!alive || mapRef.current !== map) return;
      renderer.resize();
      bumpVersion();
    };

    map.on("move", syncAndBump);
    map.on("zoom", syncAndBump);
    map.on("viewreset", syncOverlay);
    map.on("resize", syncOverlay);
    map.on("moveend", syncOverlay);
    map.on("zoomend", syncOverlay);
    const handleMoveStart = () => {
      if (programmaticMoveRef.current) return;
      userInteractedRef.current = true;
    };
    map.on("movestart", handleMoveStart);

    const resizeObserver = new ResizeObserver(() => {
      if (!alive || mapRef.current !== map) return;
      syncOverlay();
    });
    resizeObserver.observe(container);

    getGeofences()
      .then((res) => {
        // The fetch may resolve after unmount/remount: never touch a
        // removed map or a stale renderer (this is the `_leaflet_pos`
        // crash: fitBounds on a map whose _mapPane was deleted).
        if (!alive || mapRef.current !== map || rendererRef.current !== renderer) return;
        renderer.setGeofences(res.data || []);
        programmaticMoveRef.current = true;
        try {
          fitToData(map, res.data || [], bufferRef.current);
        } finally {
          window.setTimeout(() => {
            programmaticMoveRef.current = false;
          }, 800);
        }
      })
      .catch((err) => {
        if (!alive) return;
        setGeofenceError(err.message);
      });

    return () => {
      // Invalidate async callbacks FIRST so nothing below can run against
      // the map after remove() deletes its panes.
      alive = false;
      resizeObserver.disconnect();
      map.off("move", syncAndBump);
      map.off("zoom", syncAndBump);
      map.off("viewreset", syncOverlay);
      map.off("resize", syncOverlay);
      map.off("moveend", syncOverlay);
      map.off("zoomend", syncOverlay);
      map.off("movestart", handleMoveStart);
      renderer.dispose();
      map.remove();
      mapRef.current = null;
      rendererRef.current = null;
    };
  }, [bufferRef]);

  // Initial fit to data when telemetry arrives (buffer mutates, so also
  // re-check on vehicle list refresh until first successful fit).
  // Programmatic fits must not mark the user as interacted, otherwise all
  // future auto-fits stay blocked forever.
  useEffect(() => {
    if (!mapRef.current || fittedRef.current || userInteractedRef.current) return;
    const buffer = bufferRef.current;
    if (!buffer || buffer.size === 0) return;
    programmaticMoveRef.current = true;
    try {
      fitToData(mapRef.current, rendererRef.current?.geofences || [], buffer);
    } finally {
      window.setTimeout(() => {
        programmaticMoveRef.current = false;
      }, 800);
    }
    fittedRef.current = true;
  }, [bufferRef, vehicles, telemetryAvailable]);

  // Watch for the empty -> populated buffer transition so late-arriving
  // telemetry triggers the one-time fit above. Slow poll, boolean flip
  // only: no React state per telemetry event, buffer stays the hot path.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (bufferRef.current.size > 0) {
        setTelemetryAvailable((prev) => (prev ? prev : true));
      }
    }, 2000);
    return () => window.clearInterval(id);
  }, [bufferRef]);

  // Sync selected vehicle to renderer (single source: selectedVehicleId prop).
  useEffect(() => {
    if (selectedIdRef.current === selectedVehicleId) return;
    selectedIdRef.current = selectedVehicleId;
    if (rendererRef.current) {
      rendererRef.current.setSelectedVehicle(selectedVehicleId);
    }
  }, [selectedVehicleId]);

  // Fly to selected vehicle ONLY on selection change, never per frame.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedVehicleId || lastFlownIdRef.current === selectedVehicleId) return;
    const telemetry = bufferRef.current.get(selectedVehicleId);
    if (!telemetry || telemetry.latitude == null || telemetry.longitude == null) return;
    lastFlownIdRef.current = selectedVehicleId;
    programmaticMoveRef.current = true;
    map.flyTo([telemetry.latitude, telemetry.longitude], targetZoomForSelection(map), {
      duration: 1.2,
    });
    window.setTimeout(() => {
      programmaticMoveRef.current = false;
    }, 1300);
  }, [selectedVehicleId, bufferRef, displayedTelemetry, mapVersion]);

  // Keep selected telemetry fresh without per-packet React renders:
  // poll the mutable buffer at low frequency, update state only on change.
  // All setState calls happen inside async callbacks (never sync in effect
  // body) to comply with react-hooks/set-state-in-effect.
  useEffect(() => {
    if (!selectedVehicleId) {
      lastFlownIdRef.current = null;
      return;
    }
    const read = () => bufferRef.current.get(selectedVehicleId) || null;
    const equalTelemetry = (a, b) => {
      if (!a && !b) return true;
      if (!a || !b) return false;
      return (
        a.timestamp === b.timestamp &&
        a.latitude === b.latitude &&
        a.longitude === b.longitude &&
        a.speed === b.speed &&
        a.heading === b.heading
      );
    };
    const updatePosition = (telemetry) => {
      const map = mapRef.current;
      const container = containerRef.current;
      if (!map || !container || !telemetry || telemetry.latitude == null) {
        setDetailStyle(null);
        return;
      }
      try {
        const point = map.latLngToContainerPoint([telemetry.latitude, telemetry.longitude]);
        const rect = container.getBoundingClientRect();
        let left = point.x + CARD_OFFSET_X;
        let top = point.y + CARD_OFFSET_Y;
        if (left + CARD_WIDTH > rect.width - 12) left = point.x - CARD_WIDTH - CARD_OFFSET_X;
        if (left < 12) left = 12;
        if (top + CARD_HEIGHT_EST > rect.height - 12) top = rect.height - CARD_HEIGHT_EST - 12;
        if (top < 12) top = 12;
        setDetailStyle((prev) => {
          if (prev && Math.abs(prev.left - left) < 1 && Math.abs(prev.top - top) < 1) return prev;
          return { left, top };
        });
      } catch {
        setDetailStyle(null);
      }
    };
    const update = () => {
      const next = read();
      setSelectedTelemetry((prev) => (equalTelemetry(prev, next) ? prev : next ? { ...next } : next));
      updatePosition(next);
    };
    const raf = requestAnimationFrame(update);
    const id = window.setInterval(update, SELECTED_POLL_MS);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(id);
    };
  }, [selectedVehicleId, bufferRef, mapVersion]);

  // Fly to selected vehicle (exposed for parent-driven selection)
  const flyToVehicle = useCallback(
    (vehicleId) => {
      const map = mapRef.current;
      if (!map || !vehicleId) return;
      const telemetry = bufferRef.current.get(vehicleId);
      if (telemetry && telemetry.latitude != null && telemetry.longitude != null) {
        lastFlownIdRef.current = vehicleId;
        programmaticMoveRef.current = true;
        map.flyTo([telemetry.latitude, telemetry.longitude], targetZoomForSelection(map), {
          duration: 1.2,
        });
        window.setTimeout(() => {
          programmaticMoveRef.current = false;
        }, 1300);
      }
    },
    [bufferRef]
  );

  // Fleet overview button
  const handleFitFleet = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    userInteractedRef.current = false;
    fittedRef.current = false;
    programmaticMoveRef.current = true;
    fitToData(map, rendererRef.current?.geofences || [], bufferRef.current);
    window.setTimeout(() => {
      programmaticMoveRef.current = false;
    }, 800);
  }, [bufferRef]);

  // Clear selection
  const handleClearSelection = useCallback(() => {
    selectedIdRef.current = null;
    lastFlownIdRef.current = null;
    if (rendererRef.current) {
      rendererRef.current.setSelectedVehicle(null);
    }
    setSelectedTelemetry(null);
    setDetailStyle(null);
    onSelectVehicle(null);
  }, [onSelectVehicle]);

  // Expose flyToVehicle to parent via ref (kept for compatibility)
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current._flyToVehicle = flyToVehicle;
      containerRef.current._fitFleet = handleFitFleet;
    }
  }, [flyToVehicle, handleFitFleet]);

  const getContainerPos = useCallback((e) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const updateHover = useCallback(
    (clientX, clientY) => {
      const renderer = rendererRef.current;
      const map = mapRef.current;
      if (!renderer || !map) return;
      const { x, y } = getContainerPos({ clientX, clientY });
      const buffer = bufferRef.current;
      const hitId = findVehicleAtMouse(buffer, map, x, y);
      renderer.setHoveredVehicle(hitId);
      if (hitId !== lastHoveredIdRef.current) {
        lastHoveredIdRef.current = hitId;
        const vehicle = hitId ? vehiclesMapRef.current.get(hitId) || null : null;
        const telemetry = hitId ? bufferRef.current.get(hitId) || null : null;
        setTooltipState({ vehicle, telemetry, x: x + 16, y: y - 8 });
      } else if (hitId) {
        setTooltipState((prev) => (prev.vehicle ? { ...prev, x: x + 16, y: y - 8 } : prev));
      }
      if (containerRef.current) {
        containerRef.current.style.cursor = hitId ? "pointer" : "default";
      }
    },
    [bufferRef, getContainerPos]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (hoverRafRef.current) return;
      const { clientX, clientY } = e;
      hoverRafRef.current = requestAnimationFrame(() => {
        hoverRafRef.current = 0;
        updateHover(clientX, clientY);
      });
    },
    [updateHover]
  );

  useEffect(() => () => {
    if (hoverRafRef.current) cancelAnimationFrame(hoverRafRef.current);
  }, []);

  const handleClick = useCallback(
    (e) => {
      // Let Leaflet handle drags/zooms; only treat as selection when the
      // pointer hits a vehicle marker.
      const renderer = rendererRef.current;
      const map = mapRef.current;
      if (!renderer || !map) return;
      const { x, y } = getContainerPos(e);
      const buffer = bufferRef.current;
      const hitId = findVehicleAtMouse(buffer, map, x, y);
      if (!hitId) return;
      const next = selectedIdRef.current === hitId ? null : hitId;
      selectedIdRef.current = next;
      renderer.setSelectedVehicle(next);
      onSelectVehicle(next);
      // Flying is handled by the selection-change effect above.
    },
    [bufferRef, getContainerPos, onSelectVehicle]
  );

  const handleMouseLeave = useCallback(() => {
    const renderer = rendererRef.current;
    if (renderer) {
      renderer.setHoveredVehicle(null);
    }
    lastHoveredIdRef.current = null;
    setTooltipState({ vehicle: null, telemetry: null, x: 0, y: 0 });
    if (containerRef.current) {
      containerRef.current.style.cursor = "default";
    }
  }, []);

  const showTooltip = tooltipState.vehicle && tooltipState.telemetry;
  // Derive metadata from props only (no ref reads during render).
  const selectedVehicle = selectedVehicleId
    ? (vehicles || []).find((v) => v._id === selectedVehicleId) || null
    : null;

  return (
    <div
      className="live-map"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onMouseLeave={handleMouseLeave}
    >
      <canvas ref={canvasRef} className="map-canvas" />

      {/* Map controls */}
      <div className="map-control-group" onClick={(e) => e.stopPropagation()}>
        <button
          className="map-control-btn"
          onClick={handleFitFleet}
          title="Fit fleet overview"
          aria-label="Fit fleet overview"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" />
          </svg>
        </button>
      </div>

      {/* Vehicle details panel anchored near the selected vehicle */}
      {selectedVehicle && (
        <div onClick={(e) => e.stopPropagation()}>
          <VehicleDetails
            vehicle={selectedVehicle}
            telemetry={displayedTelemetry}
            onClose={handleClearSelection}
            style={detailStyle}
          />
        </div>
      )}

      {/* Geofence error */}
      {geofenceError && (
        <div className="map-error-badge">Geofences: {geofenceError}</div>
      )}

      {/* Alert center */}
      <AlertCenter
        alerts={alerts}
        onDismiss={onDismissAlert}
        alertHistory={alertHistory}
        onAlertClick={onAlertClick}
      />

      {/* Alert history toggle */}
      <div className="alert-history-toggle" onClick={(e) => e.stopPropagation()}>
        <button
          className="alert-history-btn"
          onClick={() => setShowAlertHistory(!showAlertHistory)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          {alertHistory.length > 0 && (
            <span className="badge">{alertHistory.length}</span>
          )}
        </button>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="vehicle-tooltip"
          style={{ position: "absolute", left: tooltipState.x, top: tooltipState.y }}
        >
          <MemoizedTooltip vehicle={tooltipState.vehicle} telemetry={tooltipState.telemetry} />
        </div>
      )}
    </div>
  );
}

function fitToData(map, geofences, buffer) {
  if (!map || typeof map.fitBounds !== "function") return;
  const bounds = L.latLngBounds([]);
  if (geofences && geofences.length > 0) {
    for (const geofence of geofences) {
      // Backend convention: coordinates = [[[lng, lat], ...]].
      if (!geofence || !Array.isArray(geofence.coordinates)) continue;
      const ring = geofence.coordinates[0];
      if (!Array.isArray(ring)) continue;
      for (const pt of ring) {
        if (!Array.isArray(pt) || !Number.isFinite(pt[0]) || !Number.isFinite(pt[1])) continue;
        bounds.extend([pt[1], pt[0]]);
      }
    }
  }
  if (buffer && buffer.size > 0) {
    buffer.forEach((telemetry) => {
      if (!telemetry || !Number.isFinite(telemetry.latitude) || !Number.isFinite(telemetry.longitude)) return;
      bounds.extend([telemetry.latitude, telemetry.longitude]);
    });
  }
  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }
}

export default LiveMap;
