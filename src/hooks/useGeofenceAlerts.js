import { useState, useEffect, useCallback } from "react";

const ALERT_LIFETIME_MS = 5000;

export default function useGeofenceAlerts(socket) {
  const [alerts, setAlerts] = useState([]);

  const dismiss = useCallback((alertId) => {
    setAlerts((prev) => prev.filter((a) => a.alertId !== alertId));
  }, []);

  useEffect(() => {
    function onAlert(data) {
      if (!data || !data.alertId) return;

      setAlerts((prev) => {
        if (prev.some((a) => a.alertId === data.alertId)) return prev;
        return [...prev, { ...data, receivedAt: Date.now() }];
      });
    }

    socket.on("geofence-alert", onAlert);

    return () => {
      socket.off("geofence-alert", onAlert);
    };
  }, [socket]);

  useEffect(() => {
    if (alerts.length === 0) return;

    const timer = setInterval(() => {
      setAlerts((prev) => {
        const now = Date.now();
        return prev.filter((a) => now - a.receivedAt < ALERT_LIFETIME_MS);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [alerts.length]);

  return { alerts, dismiss };
}
