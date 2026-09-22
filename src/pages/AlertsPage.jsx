import { useState, useMemo, useEffect, useCallback } from "react";
import { getAlertHistory } from "../services/api";

const FILTERS = ["ALL", "ENTRY", "EXIT"];
const MERGED_MAX = 200;

function formatDateTime(timestamp) {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
}

function formatCoord(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value.toFixed(5);
}

function sameLocalDay(timestamp, dayString) {
  if (!dayString) return true;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return false;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}` === dayString;
}

// Persisted docs carry populated vehicle/geofence objects (or plain ids
// when the referenced document was deleted). Normalize to the live
// socket-alert shape so both sources render and dedupe identically.
function normalizePersisted(doc) {
  const vehicle = doc.vehicleId && typeof doc.vehicleId === "object" ? doc.vehicleId : null;
  const geofence = doc.geofenceId && typeof doc.geofenceId === "object" ? doc.geofenceId : null;
  const vehicleId = vehicle?._id || (typeof doc.vehicleId === "string" ? doc.vehicleId : String(doc.vehicleId || ""));
  return {
    alertId: String(doc._id),
    vehicleId,
    vehicleLabel: vehicle?.registrationNumber || vehicle?.vehicleId || null,
    geofenceId: geofence?._id || (typeof doc.geofenceId === "string" ? doc.geofenceId : String(doc.geofenceId || "")),
    geofenceName: geofence?.name || doc.geofenceName || null,
    type: doc.type,
    timestamp: doc.timestamp,
    latitude: doc.latitude,
    longitude: doc.longitude,
  };
}

function AlertsPage({ alerts, alertHistory, onDismissAlert, onAlertClick, vehicles }) {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [day, setDay] = useState("");
  const [persisted, setPersisted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAlertHistory({ limit: MERGED_MAX });
      const docs = Array.isArray(res.data) ? res.data : [];
      setPersisted(docs.map(normalizePersisted));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadHistory();
    })();
  }, [loadHistory]);

  const vehicleName = useMemo(() => {
    const map = new Map();
    for (const v of vehicles || []) {
      map.set(v._id, v.registrationNumber || v.vehicleId || v._id);
    }
    return map;
  }, [vehicles]);

  // Merge persisted history with live session alerts, deduplicated by
  // alertId so a freshly generated alert never appears twice.
  const merged = useMemo(() => {
    const byId = new Map();
    for (const source of [alertHistory, alerts, persisted]) {
      for (const a of source || []) {
        if (!a || !a.alertId) continue;
        const id = String(a.alertId);
        if (!byId.has(id)) byId.set(id, { ...a, alertId: id });
      }
    }
    return [...byId.values()]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, MERGED_MAX);
  }, [alertHistory, alerts, persisted]);

  const entryCount = merged.filter((a) => a.type === "ENTRY").length;
  const exitCount = merged.filter((a) => a.type === "EXIT").length;

  const history = useMemo(() => {
    const q = search.trim().toLowerCase();
    return merged.filter((a) => {
      if (filter !== "ALL" && a.type !== filter) return false;
      if (!sameLocalDay(a.timestamp, day)) return false;
      if (!q) return true;
      const vehicleLabel = a.vehicleLabel || vehicleName.get(a.vehicleId) || a.vehicleId || "";
      const haystack = `${vehicleLabel} ${a.geofenceName || ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [merged, filter, search, day, vehicleName]);

  const hasActiveFilters = search.trim() !== "" || filter !== "ALL" || day !== "";

  function clearFilters() {
    setSearch("");
    setFilter("ALL");
    setDay("");
  }

  function vehicleDisplay(alert) {
    return alert.vehicleLabel || vehicleName.get(alert.vehicleId) || alert.vehicleId?.slice(-6) || "—";
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Alerts</h2>
          <p className="page-desc">
            Geofence entry and exit events. Select an event to center its vehicle on the Live Map.
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={loadHistory} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="summary-grid" aria-label="Alert summary">
        <div className="summary-card">
          <span className="summary-value">{merged.length}</span>
          <span className="summary-label">Total Alerts</span>
        </div>
        <div className="summary-card">
          <span className="summary-value" style={{ color: "var(--color-active)" }}>{entryCount}</span>
          <span className="summary-label">Entries</span>
        </div>
        <div className="summary-card">
          <span className="summary-value" style={{ color: "var(--color-warning)" }}>{exitCount}</span>
          <span className="summary-label">Exits</span>
        </div>
      </div>

      <div className="toolbar">
        <input
          className="input toolbar-search"
          type="text"
          placeholder="Search vehicle or geofence..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search alerts"
        />
        <input
          className="input"
          type="date"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          aria-label="Filter by date"
        />
        <div className="toolbar-filters" role="group" aria-label="Filter by alert type">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`fleet-filter-btn ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        {alerts?.length > 0 && (
          <span className="pill pill-live" aria-label={`${alerts.length} active notifications`}>
            {alerts.length} new
          </span>
        )}
      </div>

      <section className="card" aria-label="Alert history">
        <div className="card-body card-body-flush">
          {loading && persisted.length === 0 ? (
            <div className="empty-padded">
              <span className="skeleton skeleton-line" />
              <span className="skeleton skeleton-line" />
              <span className="skeleton skeleton-line" />
            </div>
          ) : error && persisted.length === 0 && merged.length === 0 ? (
            <div className="empty-padded">
              <p className="empty-text">Failed to load alert history: {error}</p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={loadHistory}>
                Retry
              </button>
            </div>
          ) : history.length === 0 ? (
            <div className="empty-padded">
              <p className="empty-text">
                No {filter === "ALL" ? "" : `${filter.toLowerCase()} `}alerts found. Geofence entry and exit events appear here in real time.
              </p>
              {hasActiveFilters && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Type</th>
                    <th scope="col">Geofence</th>
                    <th scope="col">Vehicle</th>
                    <th scope="col">Timestamp</th>
                    <th scope="col">Location</th>
                    <th scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((alert, i) => {
                    const lat = formatCoord(alert.latitude);
                    const lng = formatCoord(alert.longitude);
                    return (
                      <tr key={`${alert.alertId}-${i}`}>
                        <td data-label="Type">
                          <span className={`alert-type-badge ${alert.type === "ENTRY" ? "entry" : "exit"}`}>
                            {alert.type}
                          </span>
                        </td>
                        <td data-label="Geofence" className="strong">{alert.geofenceName || "Unknown zone"}</td>
                        <td data-label="Vehicle" className="mono">{vehicleDisplay(alert)}</td>
                        <td data-label="Timestamp" className="mono">{formatDateTime(alert.timestamp)}</td>
                        <td data-label="Location" className="mono muted">
                          {lat && lng ? `${lat}, ${lng}` : "—"}
                        </td>
                        <td data-label="Actions">
                          <div className="row-actions">
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onAlertClick(alert)}>
                              Locate
                            </button>
                            {alerts?.some((a) => a.alertId === alert.alertId) && (
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDismissAlert(alert.alertId)}>
                                Dismiss
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default AlertsPage;
