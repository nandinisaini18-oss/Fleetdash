import { useRef, useEffect, useCallback } from "react";

const REQUIRED_FIELDS = ["vehicleId", "timestamp", "latitude", "longitude", "speed", "heading"];

function isValidTelemetry(data) {
  if (!data || typeof data !== "object") return false;
  for (let i = 0; i < REQUIRED_FIELDS.length; i++) {
    if (!(REQUIRED_FIELDS[i] in data)) return false;
  }
  if (typeof data.latitude !== "number" || typeof data.longitude !== "number") return false;
  if (typeof data.speed !== "number" || typeof data.heading !== "number") return false;
  if (typeof data.vehicleId !== "string" || data.vehicleId.length === 0) return false;
  return true;
}

export default function useTelemetryBuffer(socket) {
  const bufferRef = useRef(new Map());
  const eventCountRef = useRef(0);

  const onTelemetry = useCallback((data) => {
    if (!isValidTelemetry(data)) return;
    eventCountRef.current += 1;

    const existing = bufferRef.current.get(data.vehicleId);
    if (existing) {
      existing.timestamp = data.timestamp;
      existing.latitude = data.latitude;
      existing.longitude = data.longitude;
      existing.speed = data.speed;
      existing.heading = data.heading;
    } else {
      bufferRef.current.set(data.vehicleId, {
        vehicleId: data.vehicleId,
        timestamp: data.timestamp,
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed,
        heading: data.heading,
      });
    }
  }, []);

  useEffect(() => {
    socket.on("telemetry", onTelemetry);

    return () => {
      socket.off("telemetry", onTelemetry);
    };
  }, [socket, onTelemetry]);

  return { bufferRef };
}
