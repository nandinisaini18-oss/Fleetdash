import { memo } from "react";

function formatNumber(value, digits) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

function formatTime(timestamp) {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function VehicleDetails({ vehicle, telemetry, onClose, style }) {
  if (!vehicle) return null;

  const hasTelemetry =
    telemetry && typeof telemetry.latitude === "number" && typeof telemetry.longitude === "number";

  return (
    <div
      className={`vehicle-details-panel${style ? " vehicle-details-anchored" : ""}`}
      style={style || undefined}
      role="dialog"
      aria-label={`Details for ${vehicle.registrationNumber || vehicle._id}`}
    >
      <div className="vehicle-details-header">
        <span className="vehicle-details-title">{vehicle.registrationNumber || "Vehicle"}</span>
        <button className="vehicle-details-close" onClick={onClose} aria-label="Close details">
          &#x2715;
        </button>
      </div>

      <div className="vehicle-details-status">
        <span className={`fleet-item-status status-${vehicle.status}`}>
          {vehicle.status}
        </span>
        {hasTelemetry && (
          <span style={{ fontSize: 10, color: "var(--color-foreground-muted)", fontFamily: "var(--font-mono)" }}>
            Live
          </span>
        )}
      </div>

      <div className="vehicle-details-body">
        <div className="detail-section">Vehicle</div>
        <div className="detail-row">
          <span className="detail-label">Registration</span>
          <span className="detail-value">{vehicle.registrationNumber || "—"}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Driver</span>
          <span className="detail-value">{vehicle.driverName || "—"}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Vehicle ID</span>
          <span className="detail-value" style={{ fontSize: 10 }}>{vehicle._id}</span>
        </div>

        <div className="detail-section">Telemetry</div>
        {hasTelemetry ? (
          <>
            <div className="detail-row">
              <span className="detail-label">Speed</span>
              <span className="detail-value">{formatNumber(telemetry.speed, 1)} km/h</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Heading</span>
              <span className="detail-value">{formatNumber(telemetry.heading, 0)}°</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Latitude</span>
              <span className="detail-value">{formatNumber(telemetry.latitude, 6)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Longitude</span>
              <span className="detail-value">{formatNumber(telemetry.longitude, 6)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Updated</span>
              <span className="detail-value">
                {formatTime(telemetry.timestamp)}
              </span>
            </div>
          </>
        ) : (
          <div className="detail-unavailable">
            No live location available
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(VehicleDetails);
