function AlertBanner({ alerts, onDismiss }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="alert-banner-stack">
      {alerts.map((alert) => (
        <div className="alert-banner" key={alert.alertId}>
          <div className="alert-icon">!</div>
          <div className="alert-content">
            <span className="alert-title">{alert.geofenceName}</span>
            <span className="alert-message">
              Vehicle {alert.vehicleId.slice(-6)} {alert.type === "EXIT" ? "left" : "entered"} zone
            </span>
          </div>
          <button
            className="alert-dismiss"
            onClick={() => onDismiss(alert.alertId)}
            aria-label="Dismiss"
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}

export default AlertBanner;
