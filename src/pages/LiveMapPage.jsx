import { useState, useEffect, useMemo } from "react";
import FleetPanel from "../components/FleetPanel";
import LiveMap from "../components/LiveMap";

const LIVE_THRESHOLD_MS = 30000;

function useNow(intervalMs = 5000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function LiveMapPage({
  bufferRef,
  vehicles,
  vehiclesLoading,
  vehiclesError,
  selectedVehicleId,
  onSelectVehicle,
  socketConnected,
}) {
  const now = useNow(5000);
  const liveCount = useMemo(() => {
    const list = Array.isArray(vehicles) ? vehicles : [];
    return list.filter(
      (v) => v.lastTelemetryAt && now - new Date(v.lastTelemetryAt).getTime() < LIVE_THRESHOLD_MS
    ).length;
  }, [vehicles, now]);

  return (
    <div className="page page-map">
      <div className="page-header page-header-compact">
        <div>
          <h2 className="page-title">Live Map</h2>
          <p className="page-desc">Real-time vehicle positions and geofences. Select a vehicle to center it.</p>
        </div>
        <div className="page-status">
          <span className={`pill ${socketConnected ? "pill-live" : "pill-off"}`}>
            <span className={`status-dot ${socketConnected ? "connected" : "disconnected"}`} />
            {socketConnected ? "Live" : "Offline"}
          </span>
          <span className="pill" title="Total vehicles">{vehicles?.length || 0} vehicles</span>
          <span className="pill" title="Vehicles reporting live telemetry">{liveCount} live</span>
        </div>
      </div>

      <div className="map-layout">
        <FleetPanel
          vehicles={vehicles}
          loading={vehiclesLoading}
          error={vehiclesError}
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={onSelectVehicle}
        />
        <LiveMap
          bufferRef={bufferRef}
          vehicles={vehicles}
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={onSelectVehicle}
        />
      </div>
    </div>
  );
}

export default LiveMapPage;
