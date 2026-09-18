import { useState, useMemo, useEffect, useRef } from "react";
import VehicleModal from "../components/VehicleModal";
import VehicleDeleteModal from "../components/VehicleDeleteModal";
import VehicleDetailsDrawer from "../components/VehicleDetailsDrawer";
import { createVehicle, updateVehicle, deleteVehicle } from "../services/api";

const FILTERS = ["ALL", "ACTIVE", "INACTIVE", "MAINTENANCE"];
const LIVE_THRESHOLD_MS = 30000;
const SUCCESS_DISMISS_MS = 4000;

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function formatDateTime(timestamp) {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function formatCoord(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toFixed(5);
}

function VehiclesPage({ vehicles, loading, error, bufferRef, onViewVehicle, onRefreshVehicles }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [modal, setModal] = useState({ mode: null, vehicle: null });
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [submitting, setSubmitting] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [liveSnapshot, setLiveSnapshot] = useState(null);
  const successTimerRef = useRef(0);
  const now = useNow(1000);

  useEffect(() => () => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
  }, []);

  // Keep the drawer's live telemetry fresh from the existing buffer without
  // reading refs during render. Snapshot on open, then poll while open.
  function openView(vehicle) {
    setViewing(vehicle);
    setLiveSnapshot(bufferRef?.current?.get(vehicle._id) || null);
  }

  useEffect(() => {
    if (!viewing) return;
    const id = setInterval(() => {
      setLiveSnapshot(bufferRef?.current?.get(viewing._id) || null);
    }, 1000);
    return () => clearInterval(id);
  }, [viewing, bufferRef]);

  const counts = useMemo(() => {
    const list = Array.isArray(vehicles) ? vehicles : [];
    return {
      total: list.length,
      active: list.filter((v) => v.status === "active").length,
      inactive: list.filter((v) => v.status === "inactive").length,
      maintenance: list.filter((v) => v.status === "maintenance").length,
    };
  }, [vehicles]);

  const filtered = useMemo(() => {
    let list = vehicles || [];
    if (filter !== "ALL") {
      list = list.filter((v) => v.status === filter.toLowerCase());
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (v) =>
          v.registrationNumber?.toLowerCase().includes(q) ||
          v.driverName?.toLowerCase().includes(q) ||
          v.vehicleId?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [vehicles, filter, search]);

  function flashSuccess(message) {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    setSuccessMsg(message);
    successTimerRef.current = setTimeout(() => setSuccessMsg(null), SUCCESS_DISMISS_MS);
  }

  function closeModal() {
    if (submitting) return;
    setModal({ mode: null, vehicle: null });
    setServerError(null);
  }

  function closeDelete() {
    if (submitting) return;
    setDeleting(null);
    setServerError(null);
  }

  async function handleCreate(payload) {
    setSubmitting("create");
    setServerError(null);
    try {
      const res = await createVehicle(payload);
      setModal({ mode: null, vehicle: null });
      await onRefreshVehicles();
      flashSuccess(`Vehicle ${res.data?.registrationNumber || payload.registrationNumber} created. Telemetry begins once it reports as active.`);
    } catch (err) {
      setServerError(err.message || "Failed to create vehicle.");
    } finally {
      setSubmitting(null);
    }
  }

  async function handleUpdate(payload) {
    if (!modal.vehicle) return;
    setSubmitting("update");
    setServerError(null);
    try {
      await updateVehicle(modal.vehicle._id, payload);
      setModal({ mode: null, vehicle: null });
      await onRefreshVehicles();
      flashSuccess(`Vehicle ${payload.registrationNumber} updated.`);
    } catch (err) {
      setServerError(err.message || "Failed to update vehicle.");
    } finally {
      setSubmitting(null);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setSubmitting("delete");
    setServerError(null);
    try {
      const label = deleting.registrationNumber || deleting.vehicleId || "Vehicle";
      await deleteVehicle(deleting._id);
      setDeleting(null);
      if (viewing?._id === deleting._id) {
        setViewing(null);
        setLiveSnapshot(null);
      }
      await onRefreshVehicles();
      flashSuccess(`${label} deleted. Simulation stopped for this vehicle.`);
    } catch (err) {
      setServerError(err.message || "Failed to delete vehicle.");
    } finally {
      setSubmitting(null);
    }
  }

  function openEdit(vehicle) {
    setServerError(null);
    setViewing(null);
    setLiveSnapshot(null);
    setModal({ mode: "edit", vehicle });
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Vehicles</h2>
          <p className="page-desc">
            Manage fleet vehicles. View a vehicle to center it on the Live Map.
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => { setServerError(null); setModal({ mode: "create", vehicle: null }); }}
          >
            Add Vehicle
          </button>
        </div>
      </div>

      {successMsg && (
        <p className="success-banner" role="status">{successMsg}</p>
      )}

      <div className="summary-grid" aria-label="Vehicle summary">
        <div className="summary-card">
          <span className="summary-value">{counts.total}</span>
          <span className="summary-label">Total Vehicles</span>
        </div>
        <div className="summary-card">
          <span className="summary-value" style={{ color: "var(--color-active)" }}>{counts.active}</span>
          <span className="summary-label">Active</span>
        </div>
        <div className="summary-card">
          <span className="summary-value" style={{ color: "var(--color-inactive)" }}>{counts.inactive}</span>
          <span className="summary-label">Inactive</span>
        </div>
        <div className="summary-card">
          <span className="summary-value" style={{ color: "var(--color-maintenance)" }}>{counts.maintenance}</span>
          <span className="summary-label">Maintenance</span>
        </div>
      </div>

      <div className="toolbar">
        <input
          className="input toolbar-search"
          type="text"
          placeholder="Search vehicle ID, registration, or driver..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search vehicles"
        />
        <div className="toolbar-filters" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`fleet-filter-btn ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <section className="card" aria-label="Vehicle list">
        <div className="card-body card-body-flush">
          {loading ? (
            <div className="empty-padded">
              <span className="skeleton skeleton-line" />
              <span className="skeleton skeleton-line" />
              <span className="skeleton skeleton-line" />
              <span className="skeleton skeleton-line" />
            </div>
          ) : error ? (
            <p className="empty-text empty-padded">Failed to load vehicles: {error}</p>
          ) : filtered.length === 0 ? (
            <div className="empty-padded">
              <p className="empty-text">No vehicles found.</p>
              {(search || filter !== "ALL") && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setSearch(""); setFilter("ALL"); }}
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Vehicle</th>
                    <th scope="col">Registration</th>
                    <th scope="col">Driver</th>
                    <th scope="col">Status</th>
                    <th scope="col">Last Telemetry</th>
                    <th scope="col">Current Location</th>
                    <th scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v) => {
                    const loc = v.currentLocation;
                    const hasLoc = Number.isFinite(loc?.latitude) && Number.isFinite(loc?.longitude);
                    const isLive = Boolean(
                      v.lastTelemetryAt && now - new Date(v.lastTelemetryAt).getTime() < LIVE_THRESHOLD_MS
                    );
                    return (
                      <tr key={v._id}>
                        <td data-label="Vehicle" className="mono strong">{v.vehicleId || "—"}</td>
                        <td data-label="Registration" className="mono">{v.registrationNumber || "—"}</td>
                        <td data-label="Driver">{v.driverName || "—"}</td>
                        <td data-label="Status">
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <span className={`fleet-item-status status-${v.status}`}>{v.status}</span>
                            {isLive && <span className="fleet-item-live" title="Reporting live telemetry" />}
                          </span>
                        </td>
                        <td data-label="Last Telemetry" className="mono">{formatDateTime(v.lastTelemetryAt)}</td>
                        <td data-label="Current Location" className="mono muted">
                          {hasLoc ? `${formatCoord(loc.latitude)}, ${formatCoord(loc.longitude)}` : "—"}
                        </td>
                        <td data-label="Actions">
                          <div className="row-actions">
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => openView(v)}>
                              View
                            </button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(v)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm btn-danger"
                              onClick={() => { setServerError(null); setDeleting(v); }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {modal.mode && (
        <VehicleModal
          mode={modal.mode}
          vehicle={modal.vehicle}
          submitting={submitting !== null}
          serverError={serverError}
          onSubmit={modal.mode === "create" ? handleCreate : handleUpdate}
          onClose={closeModal}
        />
      )}

      {deleting && (
        <VehicleDeleteModal
          vehicle={deleting}
          submitting={submitting === "delete"}
          serverError={serverError}
          onConfirm={handleDelete}
          onClose={closeDelete}
        />
      )}

      {viewing && (
        <VehicleDetailsDrawer
          vehicle={viewing}
          liveTelemetry={liveSnapshot}
          onClose={() => { setViewing(null); setLiveSnapshot(null); }}
          onEdit={openEdit}
          onViewOnMap={(id) => { setViewing(null); setLiveSnapshot(null); onViewVehicle(id); }}
        />
      )}
    </div>
  );
}

export default VehiclesPage;
