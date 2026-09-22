import { useState, useEffect } from "react";
import { checkHealth } from "../services/api";

function ConnectionStatus({ socketConnected }) {
  const [backendUp, setBackendUp] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        await checkHealth();
        if (!cancelled) setBackendUp(true);
      } catch {
        if (!cancelled) setBackendUp(false);
      }
    }

    poll();
    const interval = setInterval(poll, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const backendConnected = backendUp === true;
  const backendDisconnected = backendUp === false;

  return (
    <div className="connection-status-group">
      <div className="connection-status">
        <span
          className={`status-dot ${
            backendConnected ? "connected" : backendDisconnected ? "disconnected" : "checking"
          }`}
        />
        <span className="status-label">
          {backendConnected ? "Backend" : backendDisconnected ? "Backend" : "..."}
        </span>
      </div>
      <div className="connection-status">
        <span
          className={`status-dot ${socketConnected ? "connected" : "disconnected"}`}
        />
        <span className="status-label">
          {socketConnected ? "Live" : "Offline"}
        </span>
      </div>
    </div>
  );
}

export default ConnectionStatus;
