import { useRef, useEffect, useCallback } from "react";

const MIN_BINARY_SIZE = 24;

function decodeTelemetryBinary(raw) {
  try {
    const bytes = raw instanceof Uint8Array
      ? raw
      : raw instanceof ArrayBuffer
        ? new Uint8Array(raw)
        : null;

    if (!bytes || bytes.length < MIN_BINARY_SIZE) return null;

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const timestamp = view.getFloat64(0, true);
    const latitude = view.getFloat32(8, true);
    const longitude = view.getFloat32(12, true);
    const speed = view.getFloat32(16, true);
    const heading = view.getFloat32(20, true);
    const vehicleId = new TextDecoder().decode(bytes.slice(24));

    if (
      !vehicleId ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(speed) ||
      !Number.isFinite(heading) ||
      !Number.isFinite(timestamp)
    ) {
      return null;
    }

    return {
      vehicleId,
      timestamp: new Date(timestamp).toISOString(),
      latitude,
      longitude,
      speed,
      heading,
    };
  } catch {
    return null;
  }
}

function isValidTelemetry(data) {
  if (!data || typeof data !== "object") return false;
  if (typeof data.latitude !== "number" || typeof data.longitude !== "number") return false;
  if (typeof data.speed !== "number" || typeof data.heading !== "number") return false;
  if (typeof data.vehicleId !== "string" || data.vehicleId.length === 0) return false;
  if (typeof data.timestamp !== "string") return false;
  return true;
}

export default function useTelemetryBuffer(socket) {
  const bufferRef = useRef(new Map());

  const onTelemetry = useCallback((raw) => {
    const data = decodeTelemetryBinary(raw);
    if (!isValidTelemetry(data)) return;

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
    socket.on("telemetry-binary", onTelemetry);

    return () => {
      socket.off("telemetry-binary", onTelemetry);
    };
  }, [socket, onTelemetry]);

  return { bufferRef };
}
