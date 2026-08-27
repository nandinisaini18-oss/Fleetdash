import { memo } from "react";

function VehicleTooltip({ vehicle, telemetry }) {
  if (!vehicle || !telemetry) return null;

  const speed = telemetry.speed.toFixed(1);
  const heading = telemetry.heading.toFixed(0);
  const time = new Date(telemetry.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <>
      <div className="tooltip-header">
        <span className="tooltip-reg">{vehicle.registrationNumber}</span>
        <span className={`tooltip-status status-${vehicle.status}`}>{vehicle.status}</span>
      </div>
      <div className="tooltip-body">
        <div className="tooltip-row">
          <span className="tooltip-label">Driver</span>
          <span className="tooltip-value">{vehicle.driverName || "—"}</span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-label">Speed</span>
          <span className="tooltip-value">{speed} km/h</span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-label">Heading</span>
          <span className="tooltip-value">{heading}°</span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-label">Coords</span>
          <span className="tooltip-value">
            {telemetry.latitude.toFixed(5)}, {telemetry.longitude.toFixed(5)}
          </span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-label">Updated</span>
          <span className="tooltip-value">{time}</span>
        </div>
      </div>
    </>
  );
}

export default memo(VehicleTooltip);
