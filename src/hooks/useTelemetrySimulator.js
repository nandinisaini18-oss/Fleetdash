import { useEffect, useRef } from "react";

const SIM_INTERVAL_MS = 2000;
const LIST_REFRESH_MS = 15000;
const INDORE_CENTER = { lat: 22.72, lng: 75.86 };
// Operating box half-extents (degrees): keeps simulated vehicles on the
// Live Map instead of teleporting across the region.
const AREA_HALF_LAT = 0.03;
const AREA_HALF_LNG = 0.03;
const SPEED_RANGE = [20, 80];
const KM_PER_DEG_LAT = 110.574;
const DEG_TO_RAD = Math.PI / 180;

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

function initSimState() {
  return {
    latitude: INDORE_CENTER.lat + randomInRange(-0.01, 0.01),
    longitude: INDORE_CENTER.lng + randomInRange(-0.01, 0.01),
    heading: Math.floor(Math.random() * 360),
    speed: randomInRange(SPEED_RANGE[0], SPEED_RANGE[1]),
  };
}

// Advance one vehicle's simulation state by dtSeconds: small realistic
// movement along the current heading with occasional gentle turns. Heading
// stays continuous so the map's vehicle.png rotation remains correct.
function stepSimState(state, dtSeconds) {
  if (Math.random() < 0.3) {
    state.heading = (state.heading + randomInRange(-25, 25) + 360) % 360;
  }
  if (Math.random() < 0.2) {
    state.speed = Math.min(
      SPEED_RANGE[1],
      Math.max(SPEED_RANGE[0], state.speed + randomInRange(-5, 5))
    );
  }

  const distanceKm = (state.speed * dtSeconds) / 3600;
  const headingRad = state.heading * DEG_TO_RAD;
  const cosLat = Math.cos(state.latitude * DEG_TO_RAD) || 1;
  state.latitude += (distanceKm * Math.cos(headingRad)) / KM_PER_DEG_LAT;
  state.longitude += (distanceKm * Math.sin(headingRad)) / (KM_PER_DEG_LAT * cosLat);

  // Bounce off the operating-area edges instead of leaving the map.
  const minLat = INDORE_CENTER.lat - AREA_HALF_LAT;
  const maxLat = INDORE_CENTER.lat + AREA_HALF_LAT;
  const minLng = INDORE_CENTER.lng - AREA_HALF_LNG;
  const maxLng = INDORE_CENTER.lng + AREA_HALF_LNG;
  let bounced = false;
  if (state.latitude < minLat) {
    state.latitude = minLat;
    bounced = true;
  } else if (state.latitude > maxLat) {
    state.latitude = maxLat;
    bounced = true;
  }
  if (state.longitude < minLng) {
    state.longitude = minLng;
    bounced = true;
  } else if (state.longitude > maxLng) {
    state.longitude = maxLng;
    bounced = true;
  }
  if (bounced) {
    state.heading = (state.heading + 180 + randomInRange(-30, 30) + 360) % 360;
  }
}

export default function useTelemetrySimulator(enabled) {
  const vehiclesRef = useRef([]);
  const simStatesRef = useRef(new Map());
  const roundRobinRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    let active = true;

    // Periodically refresh the vehicle list so created/updated/deleted
    // vehicles are discovered without restarting the simulator.
    async function refreshVehicleList() {
      try {
        const res = await fetch("/api/analytics/vehicles").then((r) => r.json());
        if (!active || !res.success || !Array.isArray(res.data)) return;
        vehiclesRef.current = res.data;
        // Drop simulation state for vehicles that no longer exist so a
        // deleted vehicle is never simulated again.
        const ids = new Set(res.data.map((v) => v._id));
        const states = simStatesRef.current;
        states.forEach((_, id) => {
          if (!ids.has(id)) states.delete(id);
        });
      } catch {
        // Keep the last known list on refresh failure.
      }
    }

    refreshVehicleList();
    const listIntervalId = setInterval(refreshVehicleList, LIST_REFRESH_MS);

    const simIntervalId = setInterval(() => {
      // Identity is always the MongoDB _id (backend telemetry contract);
      // vehicleId is only a display identifier. Only active vehicles move.
      const activeVehicles = vehiclesRef.current.filter((v) => v.status === "active");
      if (activeVehicles.length === 0) return;
      roundRobinRef.current = roundRobinRef.current % activeVehicles.length;
      const vehicle = activeVehicles[roundRobinRef.current];
      roundRobinRef.current += 1;

      let state = simStatesRef.current.get(vehicle._id);
      if (!state) {
        state = initSimState();
        // Resume from the vehicle's last known position when available.
        const loc = vehicle.currentLocation;
        if (Number.isFinite(loc?.latitude) && Number.isFinite(loc?.longitude)) {
          state.latitude = loc.latitude;
          state.longitude = loc.longitude;
        }
        simStatesRef.current.set(vehicle._id, state);
      }
      stepSimState(state, SIM_INTERVAL_MS / 1000);

      fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicle._id,
          timestamp: Date.now(),
          latitude: state.latitude,
          longitude: state.longitude,
          speed: state.speed,
          heading: Math.round(state.heading),
        }),
      }).catch(() => {});
    }, SIM_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(listIntervalId);
      clearInterval(simIntervalId);
    };
  }, [enabled]);
}
