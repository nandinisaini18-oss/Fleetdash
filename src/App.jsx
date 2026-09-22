import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "./components/Sidebar";
import ConnectionStatus from "./components/ConnectionStatus";
import DashboardPage from "./pages/DashboardPage";
import LiveMapPage from "./pages/LiveMapPage";
import VehiclesPage from "./pages/VehiclesPage";
import GeofencesPage from "./pages/GeofencesPage";
import AlertsPage from "./pages/AlertsPage";
import { getOverviewAnalytics, getVehicleAnalytics } from "./services/api";
import useSocket from "./hooks/useSocket";
import useTelemetryBuffer from "./hooks/useTelemetryBuffer";
import useGeofenceAlerts from "./hooks/useGeofenceAlerts";
import useTelemetrySimulator from "./hooks/useTelemetrySimulator";
import "./App.css";

const PAGE_META = {
  dashboard: { title: "Dashboard" },
  map: { title: "Live Map" },
  vehicles: { title: "Vehicles" },
  geofences: { title: "Geofences" },
  alerts: { title: "Alerts" },
};

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  // View a vehicle from any page: select it and jump to the Live Map.
  // LiveMap centers on change; buffer, canvas, and geofences are untouched.
  const handleViewVehicle = useCallback((vehicleId) => {
    if (!vehicleId) return;
    setSelectedVehicleId(vehicleId);
    setActivePage("map");
  }, []);

  // Click alert to focus vehicle on map
  const handleAlertClick = useCallback(
    (alert) => {
      if (alert.vehicleId) {
        handleViewVehicle(alert.vehicleId);
      }
    },
    [handleViewVehicle]
  );

  const handleNavigate = useCallback((page) => {
    setActivePage(page);
  }, []);

  const pageMeta = PAGE_META[activePage] || PAGE_META.dashboard;

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        socketConnected={isConnected}
        alertCount={alertHistory.length}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />
      <div className="app-main">
        <header className="topbar">
          <h1 className="topbar-title">{pageMeta.title}</h1>
          <div className="topbar-right">
            <ConnectionStatus socketConnected={isConnected} />
          </div>
        </header>
        <main className="app-content">
          {activePage === "dashboard" && (
            <DashboardPage
              overview={overview}
              overviewLoading={overviewLoading}
              overviewError={overviewError}
              vehicles={vehicles}
              vehiclesLoading={vehiclesLoading}
              vehiclesError={vehiclesError}
              alertHistory={alertHistory}
              socketConnected={isConnected}
              onOpenMap={() => setActivePage("map")}
              onViewVehicle={handleViewVehicle}
            />
          )}
          {activePage === "map" && (
            <LiveMapPage
              bufferRef={bufferRef}
              vehicles={vehicles}
              vehiclesLoading={vehiclesLoading}
              vehiclesError={vehiclesError}
              selectedVehicleId={selectedVehicleId}
              onSelectVehicle={handleSelectVehicle}
              socketConnected={isConnected}
            />
          )}
          {activePage === "vehicles" && (
            <VehiclesPage
              vehicles={vehicles}
              loading={vehiclesLoading}
              error={vehiclesError}
              bufferRef={bufferRef}
              onViewVehicle={handleViewVehicle}
              onRefreshVehicles={fetchVehicles}
            />
          )}
          {activePage === "geofences" && (
            <GeofencesPage />
          )}
          {activePage === "alerts" && (
            <AlertsPage
              alerts={alerts}
              alertHistory={alertHistory}
              onDismissAlert={dismissAlert}
              onAlertClick={handleAlertClick}
              vehicles={vehicles}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
