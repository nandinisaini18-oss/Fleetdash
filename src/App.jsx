import { useState, useEffect, useCallback } from "react";
import Header from "./components/Header";
import StatsPanel from "./components/StatsPanel";
import FleetPanel from "./components/FleetPanel";
import LiveMap from "./components/LiveMap";
import AlertBanner from "./components/AlertBanner";
import { getOverviewAnalytics, getVehicleAnalytics } from "./services/api";
import useSocket from "./hooks/useSocket";
import useTelemetryBuffer from "./hooks/useTelemetryBuffer";
import useGeofenceAlerts from "./hooks/useGeofenceAlerts";
import "./App.css";

function App() {
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState(null);

  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [vehiclesError, setVehiclesError] = useState(null);

  const { socket, isConnected } = useSocket();
  const { bufferRef } = useTelemetryBuffer(socket);
  const { alerts, dismiss: dismissAlert } = useGeofenceAlerts(socket);

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
    function init() {
      fetchOverview();
      fetchVehicles();
    }

    init();

    const interval = setInterval(() => {
      fetchOverview();
      fetchVehicles();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchOverview, fetchVehicles]);

  return (
    <div className="dashboard">
      <Header socketConnected={isConnected} />
      <StatsPanel overview={overview} loading={overviewLoading} error={overviewError} />
      <div className="dashboard-body">
        <FleetPanel vehicles={vehicles} loading={vehiclesLoading} error={vehiclesError} />
        <LiveMap bufferRef={bufferRef} vehicles={vehicles} />
      </div>
      <AlertBanner alerts={alerts} onDismiss={dismissAlert} />
    </div>
  );
}

export default App;
