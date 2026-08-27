function FleetPanel({ vehicles, loading, error }) {
  if (loading) {
    return (
      <aside className="fleet-panel">
        <div className="fleet-panel-header">
          <h2 className="fleet-panel-title">Fleet</h2>
          <span className="fleet-count">...</span>
        </div>
        <ul className="fleet-list">
          {Array.from({ length: 5 }).map((_, i) => (
            <li className="fleet-item fleet-item--loading" key={i}>
              <div className="fleet-item-top">
                <span className="fleet-item-reg fleet-skeleton" />
                <span className="fleet-item-status fleet-skeleton-badge" />
              </div>
              <div className="fleet-item-bottom">
                <span className="fleet-item-driver fleet-skeleton" />
                <span className="fleet-item-time fleet-skeleton" />
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
          <span>Failed to load fleet</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="fleet-panel">
      <div className="fleet-panel-header">
        <h2 className="fleet-panel-title">Fleet</h2>
        <span className="fleet-count">{vehicles.length} vehicles</span>
      </div>
      {vehicles.length === 0 ? (
        <div className="fleet-empty">
          <span>No vehicles found</span>
        </div>
      ) : (
        <ul className="fleet-list">
          {vehicles.map((vehicle) => (
            <li className="fleet-item" key={vehicle._id}>
              <div className="fleet-item-top">
                <span className="fleet-item-reg">{vehicle.registrationNumber}</span>
                <span className={`fleet-item-status status-${vehicle.status}`}>
                  {vehicle.status}
                </span>
              </div>
              <div className="fleet-item-bottom">
                <span className="fleet-item-driver">{vehicle.driverName || "—"}</span>
                <span className="fleet-item-time">
                  {vehicle.lastTelemetryAt
                    ? new Date(vehicle.lastTelemetryAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

export default FleetPanel;
