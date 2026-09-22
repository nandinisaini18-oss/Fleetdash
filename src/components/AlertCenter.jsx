function AlertCenter({ alerts, onDismiss, alertHistory, onAlertClick }) {
  return (
    <>
      {alerts.length > 0 && (
        <div className="alert-center">
          {alerts.map((alert) => (
            <div
              className={`alert-item ${alert.type === "ENTRY" ? "entry" : "exit"}`}
              key={alert.alertId}
            >
              <span className={`alert-type-badge ${alert.type === "ENTRY" ? "entry" : "exit"}`}>
                {alert.type}
              </span>
              <div className="alert-content">
                <div className="alert-title">{alert.geofenceName}</div>
                <div className="alert-message">
                  Vehicle {alert.vehicleId?.slice(-6)} {alert.type === "EXIT" ? "left" : "entered"} zone
                </div>
                <div className="alert-time">
                  {alert.timestamp
                    ? new Date(alert.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                    : "Just now"}
                </div>
              </div>
              <button
                className="alert-dismiss"
                onClick={() => onDismiss(alert.alertId)}
                aria-label="Dismiss alert"
              >
                &#x2715;
              </button>
            </div>
          ))}
        </div>
      )}

      {alertHistory.length > 0 && (
        <AlertHistoryPanel
          alertHistory={alertHistory}
          onAlertClick={onAlertClick}
        />
      )}
    </>
  );
}

function AlertHistoryPanel({ alertHistory, onAlertClick }) {
  return (
    <div className="alert-history-panel">
      <div className="alert-history-header">
        <span>Alert History</span>
        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 400, color: "var(--color-foreground-subtle)" }}>
          {alertHistory.length}
        </span>
      </div>
      <div className="alert-history-list">
        {alertHistory.map((alert, i) => (
          <div
            className="alert-history-item"
            key={`${alert.alertId}-${i}`}
            onClick={() => onAlertClick?.(alert)}
          >
            <span className={`alert-type-badge ${alert.type === "ENTRY" ? "entry" : "exit"}`}>
              {alert.type}
            </span>
            <div className="alert-content">
              <div className="alert-title">{alert.geofenceName}</div>
              <div className="alert-message">
                Vehicle {alert.vehicleId?.slice(-6)}
              </div>
            </div>
            <div className="alert-time">
              {alert.timestamp
                ? new Date(alert.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AlertCenter;
