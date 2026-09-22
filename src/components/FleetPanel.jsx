import { useState, useMemo, useEffect } from "react";

const FILTERS = ["ALL", "ACTIVE", "INACTIVE", "MAINTENANCE"];

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function FleetPanel({ vehicles, loading, error, selectedVehicleId, onSelectVehicle }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const now = useNow(1000);

  const filtered = useMemo(() => {
    let list = vehicles || [];

    if (filter !== "ALL") {
      list = list.filter((v) => v.status === filter.toLowerCase());
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (v) =>
          v.registrationNumber?.toLowerCase().includes(q) ||
          v.driverName?.toLowerCase().includes(q) ||
          v.vehicleId?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [vehicles, filter, search]);

  if (loading) {
    return (
      <aside className="fleet-panel">
        <div className="fleet-panel-header">
          <h2 className="fleet-panel-title">Fleet</h2>
          <span className="fleet-count">...</span>
        </div>
        <ul className="fleet-list">
          {Array.from({ length: 5 }).map((_, i) => (
            <li className="fleet-item" key={i}>
              <div className="fleet-item-top">
                <span className="skeleton fleet-skeleton" />
                <span className="skeleton fleet-skeleton-badge" />
              </div>
              <div className="fleet-item-bottom">
                <span className="skeleton fleet-skeleton-sm" />
                <span className="skeleton fleet-skeleton-sm" />
              </div>
            </li>
          ))}
        </ul>
      </aside>
    );
  }

  if (error) {
    return (
      <aside className="fleet-panel">
        <div className="fleet-panel-header">
          <h2 className="fleet-panel-title">Fleet</h2>
        </div>
        <div className="fleet-empty fleet-empty--error">
          <span className="fleet-empty-text">Failed to load fleet</span>
          <span className="fleet-empty-hint">{error}</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="fleet-panel">
      <div className="fleet-panel-header">
        <h2 className="fleet-panel-title">Fleet</h2>
        <span className="fleet-count">{filtered.length} / {vehicles?.length || 0}</span>
      </div>

      <div className="fleet-search">
        <input
          className="fleet-search-input"
          type="text"
          placeholder="Search vehicles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="fleet-filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`fleet-filter-btn ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="fleet-empty">
          <span className="fleet-empty-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 8h13v8H1z" />
              <path d="M14 11h4l3 3v2h-7z" />
              <circle cx="6" cy="18" r="1.6" />
              <circle cx="17" cy="18" r="1.6" />
            </svg>
          </span>
          <span className="fleet-empty-text">
            {search || filter !== "ALL" ? "No matching vehicles" : "No vehicles found"}
          </span>
          {(search || filter !== "ALL") && (
            <button
              className="fleet-empty-hint"
              onClick={() => { setSearch(""); setFilter("ALL"); }}
              style={{ color: "var(--color-primary)", cursor: "pointer", marginTop: 4, fontSize: 11 }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <ul className="fleet-list">
          {filtered.map((vehicle) => {
            const isLive = Boolean(
              vehicle.lastTelemetryAt &&
              now - new Date(vehicle.lastTelemetryAt).getTime() < 30000
            );
            const isSelected = vehicle._id === selectedVehicleId;

            return (
              <li
                key={vehicle._id}
                className={`fleet-item ${isSelected ? "selected" : ""}`}
                onClick={() => onSelectVehicle(vehicle._id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectVehicle(vehicle._id);
                  }
                }}
              >
                <div className="fleet-item-top">
                  <span className="fleet-item-reg">{vehicle.registrationNumber}</span>
                  <span className={`fleet-item-status status-${vehicle.status}`}>
                    {vehicle.status}
                  </span>
                </div>
                <div className="fleet-item-bottom">
                  <span className="fleet-item-driver">{vehicle.driverName || "—"}</span>
                  <div className="fleet-item-meta">
                    {vehicle.lastTelemetryAt && (
                      <span className="fleet-item-time">
                        {new Date(vehicle.lastTelemetryAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                    <span className={isLive ? "fleet-item-live" : "fleet-item-offline"} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

export default FleetPanel;
