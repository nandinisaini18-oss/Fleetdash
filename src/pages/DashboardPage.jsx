import { useState, useEffect, useMemo } from "react";
import StatsPanel from "../components/StatsPanel";

const LIVE_THRESHOLD_MS = 30000;

function useNow(intervalMs = 5000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function formatTime(timestamp) {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function DashboardPage({
  overview,
  overviewLoading,
  overviewError,
  vehicles,
  vehiclesLoading,
  vehiclesError,
  alertHistory,
  socketConnected,
  onOpenMap,
  onViewVehicle,
}) {
  const statusCounts = overview?.vehicles || null;
  const totalAlerts = overview?.geofence?.totalAlerts;
  const now = useNow(5000);

  const liveVehicles = useMemo(() => {
    const list = Array.isArray(vehicles) ? vehicles : [];
    return list
      .filter((v) => v.lastTelemetryAt && now - new Date(v.lastTelemetryAt).getTime() < LIVE_THRESHOLD_MS)
      .sort((a, b) => new Date(b.lastTelemetryAt).getTime() - new Date(a.lastTelemetryAt).getTime());
  }, [vehicles, now]);

  const total = Number(statusCounts?.total) || 0;
  const active = Number(statusCounts?.active) || 0;
  const inactive = Number(statusCounts?.inactive) || 0;
  const maintenance = Number(statusCounts?.maintenance) || 0;
  const activePct = total > 0 ? Math.round((active / total) * 100) : 0;
  const inactivePct = total > 0 ? Math.round((inactive / total) * 100) : 0;
  const maintenancePct = total > 0 ? Math.max(0, 100 - activePct - inactivePct) : 0;

  const recentAlerts = Array.isArray(alertHistory) ? alertHistory.slice(0, 5) : [];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-desc">Operational summary of the fleet, telemetry connection, and recent alerts.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={onOpenMap}>
            Open Live Map
          </button>
        </div>
      </div>

      <StatsPanel overview={overview} loading={overviewLoading} error={overviewError} />

      <div className="page-grid">
        <section className="card" aria-label="Fleet overview">
          <div className="card-header">
            <h3 className="card-title">Fleet Overview</h3>
            <span className={`pill ${socketConnected ? "pill-live" : "pill-off"}`}>
              <span className={`status-dot ${socketConnected ? "connected" : "disconnected"}`} />
              {socketConnected ? "Telemetry live" : "Telemetry offline"}
            </span>
          </div>
          {overviewLoading ? (
            <div className="card-body">
              <span className="skeleton skeleton-bar" />
              <span className="skeleton skeleton-line" />
              <span className="skeleton skeleton-line" />
            </div>
          ) : overviewError || !statusCounts ? (
            <div className="card-body">
              <p className="empty-text">{overviewError ? `Overview unavailable: ${overviewError}` : "No overview data."}</p>
            </div>
          ) : (
            <div className="card-body">
              <div className="dist-bar" role="img" aria-label={`${active} active, ${inactive} inactive, ${maintenance} maintenance of ${total} vehicles`}>
                {activePct > 0 && <span className="dist-seg dist-active" style={{ width: `${activePct}%` }} />}
                {inactivePct > 0 && <span className="dist-seg dist-inactive" style={{ width: `${inactivePct}%` }} />}
                {maintenancePct > 0 && <span className="dist-seg dist-maintenance" style={{ width: `${maintenancePct}%` }} />}
              </div>
              <ul className="dist-legend">
                <li><span className="stat-dot" style={{ background: "var(--color-active)" }} /> Active <strong>{active}</strong></li>
                <li><span className="stat-dot" style={{ background: "var(--color-inactive)" }} /> Inactive <strong>{inactive}</strong></li>
                <li><span className="stat-dot" style={{ background: "var(--color-maintenance)" }} /> Maintenance <strong>{maintenance}</strong></li>
              </ul>
              <div className="overview-meta">
                <span>{total} vehicles tracked</span>
                <span aria-label="Total alerts">{typeof totalAlerts === "number" ? `${totalAlerts} total alerts` : "Alert total unavailable"}</span>
              </div>
            </div>
          )}
        </section>

        <section className="card" aria-label="Recent alerts">
          <div className="card-header">
            <h3 className="card-title">Recent Alerts</h3>
            <span className="card-count">{recentAlerts.length}</span>
          </div>
          <div className="card-body card-body-flush">
            {recentAlerts.length === 0 ? (
              <p className="empty-text empty-padded">No alerts recorded. New geofence entry/exit events will appear here.</p>
            ) : (
              <ul className="mini-list">
                {recentAlerts.map((alert, i) => (
                  <li className="mini-list-item" key={`${alert.alertId}-${i}`}>
                    <span className={`alert-type-badge ${alert.type === "ENTRY" ? "entry" : "exit"}`}>
                      {alert.type}
                    </span>
                    <span className="mini-list-main">
                      <span className="mini-list-title">{alert.geofenceName || "Unknown zone"}</span>
                      <span className="mini-list-sub">Vehicle {alert.vehicleId?.slice(-6) || "—"}</span>
                    </span>
                    <span className="mini-list-time">{formatTime(alert.timestamp)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <section className="card" aria-label="Live operations">
        <div className="card-header">
          <h3 className="card-title">Live Operations</h3>
          <span className="card-count">{liveVehicles.length} live</span>
        </div>
        <div className="card-body card-body-flush">
          {vehiclesLoading ? (
            <div className="empty-padded">
              <span className="skeleton skeleton-line" />
              <span className="skeleton skeleton-line" />
              <span className="skeleton skeleton-line" />
            </div>
          ) : vehiclesError ? (
            <p className="empty-text empty-padded">Vehicle list unavailable: {vehiclesError}</p>
          ) : liveVehicles.length === 0 ? (
            <p className="empty-text empty-padded">
              No vehicles reporting live telemetry right now. Open the Live Map to monitor the fleet.
            </p>
          ) : (
            <ul className="mini-list mini-list-grid">
              {liveVehicles.slice(0, 6).map((v) => (
                <li className="mini-list-item" key={v._id}>
                  <span className="fleet-item-live" aria-hidden="true" />
                  <span className="mini-list-main">
                    <span className="mini-list-title">{v.registrationNumber || v._id}</span>
                    <span className="mini-list-sub">{v.driverName || "—"} · {formatTime(v.lastTelemetryAt)}</span>
                  </span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => onViewVehicle(v._id)}>
                    View
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;
