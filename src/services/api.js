const BASE_URL = "/api";

async function request(endpoint) {
  const response = await fetch(`${BASE_URL}${endpoint}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Network error" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  return response.json();
}

export async function checkHealth() {
  return request("/health");
}

export async function getOverviewAnalytics() {
  return request("/analytics/overview");
}

export async function getVehicleAnalytics() {
  return request("/analytics/vehicles");
}

export async function getGeofences() {
  return request("/geofences");
}

export async function getTelemetryAnalytics() {
  return request("/analytics/telemetry");
}

export async function getGeofenceAnalytics() {
  return request("/analytics/geofences");
}
