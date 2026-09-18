import { useEffect } from "react";

function formatNumber(value, digits) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

function formatDateTime(timestamp) {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
}

function VehicleDetailsDrawer({ vehicle, liveTelemetry, onClose, onEdit, onViewOnMap }) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!vehicle) return null;

  const hasLive =
    liveTelemetry &&
    Number.isFinite(liveTelemetry.latitude) &&
    Number.isFinite(liveTelemetry.longitude);
  const latitude = hasLive ? liveTelemetry.latitude : vehicle.currentLocation?.latitude;
  const longitude = hasLive ? liveTelemetry.longitude : vehicle.currentLocation?.longitude;

  return (
    <div className="modal-scrim" onClick={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${vehicle.registrationNumber || vehicle.vehicleId || vehicle._id}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">{vehicle.registrationNumber || "Vehicle"}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close details">
            &#x2715;
          </button>
        </div>
        <div className="drawer-body">
          <div className="detail-row">
            <span className="detail-label">Vehicle ID</span>
            <span className="detail-value mono">{vehicle.vehicleId || "—"}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Registration</span>
            <span className="detail-value">{vehicle.registrationNumber || "—"}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Driver</span>
            <span className="detail-value">{vehicle.driverName || "—"}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Status</span>
            <span className={`fleet-item-status status-${vehicle.status}`}>{vehicle.status}</span>
          </div>

          <div className="detail-section">Position {hasLive ? "(live)" : "(last known)"}</div>
          <div className="detail-row">
            <span className="detail-label">Latitude</span>
            <span className="detail-value mono">{formatNumber(latitude, 6)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Longitude</span>
            <span className="detail-value mono">{formatNumber(longitude, 6)}</span>
          </div>

          {hasLive && (
            <>
              <div className="detail-section">Live Telemetry</div>
              <div className="detail-row">
                <span className="detail-label">Speed</span>
                <span className="detail-value mono">{formatNumber(liveTelemetry.speed, 1)} km/h</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Heading</span>
                <span className="detail-value mono">{formatNumber(liveTelemetry.heading, 0)}°</span>
              </div>
            </>
          )}

          <div className="detail-section">Record</div>
          <div className="detail-row">
            <span className="detail-label">Last Telemetry</span>
            <span className="detail-value">{formatDateTime(vehicle.lastTelemetryAt)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Created</span>
            <span className="detail-value">{formatDateTime(vehicle.createdAt)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Updated</span>
            <span className="detail-value">{formatDateTime(vehicle.updatedAt)}</span>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={() => onEdit(vehicle)}>
            Edit
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onViewOnMap(vehicle._id)}>
            View on Map
          </button>
        </div>
      </aside>
    </div>
  );
}

export default VehicleDetailsDrawer;
