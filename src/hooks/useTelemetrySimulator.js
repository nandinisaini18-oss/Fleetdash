import { useEffect, useRef } from "react";

const SIM_INTERVAL_MS = 2000;
const INDORE_CENTER = { lat: 22.72, lng: 75.86 };
const JITTER = 0.005;
const SPEED_RANGE = [20, 80];

function jitterCoord(center, range) {
  return center + (Math.random() * 2 - 1) * range;
}

export default function useTelemetrySimulator(enabled) {
  const vehiclesRef = useRef([]);

  useEffect(() => {
    if (!enabled) return;

    let active = true;

    fetch("/api/analytics/vehicles")
      .then((r) => r.json())
      .then((res) => {
        if (active && res.success && Array.isArray(res.data)) {
          vehiclesRef.current = res.data;
        }
      })
      .catch(() => {});

    const intervalId = setInterval(() => {
      const vehicles = vehiclesRef.current;
      if (vehicles.length === 0) return;

      const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)];

      fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicle._id,
          timestamp: Date.now(),
          latitude: jitterCoord(INDORE_CENTER.lat, JITTER),
          longitude: jitterCoord(INDORE_CENTER.lng, JITTER),
          speed: SPEED_RANGE[0] + Math.random() * (SPEED_RANGE[1] - SPEED_RANGE[0]),
          heading: Math.floor(Math.random() * 360),
        }),
      }).catch(() => {});
    }, SIM_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [enabled]);
}
