const BASE_URL = "/api";

async function request(endpoint, options = {}) {
  const config = { ...options };
  if (config.body !== undefined && typeof config.body === "object") {
    config.body = JSON.stringify(config.body);
    config.headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  }
  const response = await fetch(`${BASE_URL}${endpoint}`, config);
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

export async function getGeofence(id) {
  return request(`/geofences/${id}`);
}

export async function createGeofence(data) {
  return request("/geofences", { method: "POST", body: data });
}

export async function updateGeofence(id, data) {
  return request(`/geofences/${id}`, { method: "PATCH", body: data });
}

export async function deleteGeofence(id) {
  return request(`/geofences/${id}`, { method: "DELETE" });
}

export async function getTelemetryAnalytics() {
  return request("/analytics/telemetry");
}

export async function getGeofenceAnalytics() {
  return request("/analytics/geofences");
}

export async function getAlertHistory(params = {}) {
  const qs = new URLSearchParams();
  if (params.type === "ENTRY" || params.type === "EXIT") qs.set("type", params.type);
  if (params.date) qs.set("date", params.date);
  if (params.limit) qs.set("limit", String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request(`/analytics/alerts${suffix}`);
}

export async function getVehicles() {
  return request("/vehicles");
}

export async function getVehicle(id) {
  return request(`/vehicles/${id}`);
}

export async function createVehicle(data) {
  return request("/vehicles", { method: "POST", body: data });
}

export async function updateVehicle(id, data) {
  return request(`/vehicles/${id}`, { method: "PATCH", body: data });
}

export async function deleteVehicle(id) {
  return request(`/vehicles/${id}`, { method: "DELETE" });
}
