import { useState, useEffect, useCallback, useRef } from "react";
import Header from "./components/Header";
import StatsPanel from "./components/StatsPanel";
import FleetPanel from "./components/FleetPanel";
import LiveMap from "./components/LiveMap";
import { getOverviewAnalytics, getVehicleAnalytics } from "./services/api";
import useSocket from "./hooks/useSocket";
import useTelemetryBuffer from "./hooks/useTelemetryBuffer";
import useGeofenceAlerts from "./hooks/useGeofenceAlerts";
import useTelemetrySimulator from "./hooks/useTelemetrySimulator";
import "./App.css";

function App() {
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState(null);

  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [vehiclesError, setVehiclesError] = useState(null);

  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [alertHistory, setAlertHistory] = useState([]);

  const alertHistoryRef = useRef([]);

  const { socket, isConnected } = useSocket();
  const { bufferRef } = useTelemetryBuffer(socket);
  const { alerts, dismiss: dismissAlert } = useGeofenceAlerts(socket);
  useTelemetrySimulator(isConnected);

  // Track alert history via ref to avoid setState-in-effect
  useEffect(() => {
    if (alerts.length === 0) return;
    const prev = alertHistoryRef.current;
    const newAlerts = alerts.filter((a) => !prev.some((p) => p.alertId === a.alertId));
    if (newAlerts.length > 0) {
      const updated = [...newAlerts.map((a) => ({ ...a, receivedAt: Date.now() })), ...prev].slice(0, 50);
      alertHistoryRef.current = updated;
      setAlertHistory(updated);
    }
  }, [alerts]);

  const fetchOverview = useCallback(async () => {
    try {
      setOverviewLoading(true);
      setOverviewError(null);
      const res = await getOverviewAnalytics();
      setOverview(res.data);
    } catch (err) {
      setOverviewError(err.message);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const fetchVehicles = useCallback(async () => {
    try {
      setVehiclesLoading(true);
      setVehiclesError(null);
      const res = await getVehicleAnalytics();
      setVehicles(res.data);
    } catch (err) {
      setVehiclesError(err.message);
    } finally {
      setVehiclesLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      await Promise.all([fetchOverview(), fetchVehicles()]);
      if (!active) return;
    })();
    const interval = setInterval(() => {
      fetchOverview();
      fetchVehicles();
    }, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [fetchOverview, fetchVehicles]);

  // Vehicle selection: single source of truth is the backend MongoDB `_id`.
  // Map fly-to is handled inside LiveMap on selection change using the
  // live telemetry buffer, so no DOM escape hatch is needed here.
  const handleSelectVehicle = useCallback(
    (vehicleId) => {
      if (vehicleId === selectedVehicleId) {
        setSelectedVehicleId(null);
        return;
      }
      setSelectedVehicleId(vehicleId);
    },
    [selectedVehicleId]
  );

  // Click alert to focus vehicle on map
  const handleAlertClick = useCallback(
    (alert) => {
      if (alert.vehicleId) {
        handleSelectVehicle(alert.vehicleId);
      }
    },
    [handleSelectVehicle]
  );

  return (
    <div className="dashboard">
      <Header overview={overview} socketConnected={isConnected} />
      <StatsPanel overview={overview} loading={overviewLoading} error={overviewError} />
      <div className="dashboard-body">
        <FleetPanel
          vehicles={vehicles}
          loading={vehiclesLoading}
          error={vehiclesError}
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={handleSelectVehicle}
        />
        <LiveMap
          bufferRef={bufferRef}
          vehicles={vehicles}
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={setSelectedVehicleId}
          alerts={alerts}
          onDismissAlert={dismissAlert}
          alertHistory={alertHistory}
          onAlertClick={handleAlertClick}
        />
      </div>
    </div>
  );
}

export default App;
