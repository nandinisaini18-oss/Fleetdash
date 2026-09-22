import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import GeofenceEditorMap from "../components/GeofenceEditorMap";
import ConfirmModal from "../components/ConfirmModal";
import {
  getGeofences,
  createGeofence,
  updateGeofence,
  deleteGeofence,
} from "../services/api";
import { backendRingToCorners, cornersToBackend, countCorners } from "../utils/geofence";

const FILTERS = ["ALL", "ACTIVE", "INACTIVE"];
const REQUIRED_CORNERS = 4;
const SUCCESS_DISMISS_MS = 4000;

// Always show the real backend name; only legacy docs without a name fall
// back to an identifying label (never a bare generic one).
function geofenceLabel(geofence) {
  if (geofence?.name) return geofence.name;
  const suffix = typeof geofence?._id === "string" ? geofence._id.slice(-6) : "";
  return suffix ? `Zone ${suffix}` : "Unnamed zone";
}

function GeofencesPage() {
  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  // Creation / editing state lives here, separate from global app state.
  const [mode, setMode] = useState(null);
  const [editingId, setEditingId] = useState(null);
  // Single source of truth for fence selection (list <-> map highlight).
  const [selectedGeofenceId, setSelectedGeofenceId] = useState(null);
  // Explicit center requests so data reloads never move the viewport.
  const [focusRequest, setFocusRequest] = useState(null);
  const focusSeqRef = useRef(0);
  const [draftPoints, setDraftPoints] = useState([]);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const successTimerRef = useRef(0);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getGeofences();
      setGeofences(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  useEffect(() => () => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
  }, []);

  function flashSuccess(message) {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    setSuccessMsg(message);
    successTimerRef.current = setTimeout(() => setSuccessMsg(null), SUCCESS_DISMISS_MS);
  }

  function resetDraft() {
    setMode(null);
    setEditingId(null);
    setSelectedGeofenceId(null);
    setDraftPoints([]);
    setName("");
    setFormError(null);
  }

  function requestFocus(id) {
    focusSeqRef.current += 1;
    setFocusRequest({ id, seq: focusSeqRef.current });
  }

  function handleSelectGeofence(id) {
    // Re-clicking the selected fence keeps it selected.
    setSelectedGeofenceId(id);
    requestFocus(id);
  }

  function enterCreate() {
    setDeleting(null);
    setMode("create");
    setEditingId(null);
    setSelectedGeofenceId(null);
    setDraftPoints([]);
    setName("");
    setFormError(null);
  }

  function enterEdit(geofence) {
    setDeleting(null);
    setMode("edit");
    setEditingId(geofence._id);
    setSelectedGeofenceId(geofence._id);
    requestFocus(geofence._id);
    setDraftPoints(backendRingToCorners(geofence));
    setName(geofence.name || "");
    setFormError(null);
  }

  function handleMapClick(point) {
    if (mode !== "create") return;
    setDraftPoints((prev) => {
      if (prev.length >= REQUIRED_CORNERS) return prev;
      return [...prev, point];
    });
  }

  function handleCornerDrag(index, point) {
    setDraftPoints((prev) => prev.map((pt, i) => (i === index ? point : pt)));
  }

  function handleUndoPoint() {
    setDraftPoints((prev) => prev.slice(0, -1));
  }

  function handleClearPoints() {
    setDraftPoints([]);
  }

  async function handleSave() {
    if (submitting) return;
    if (draftPoints.length !== REQUIRED_CORNERS) {
      setFormError(`Select exactly ${REQUIRED_CORNERS} corners on the map (${draftPoints.length}/4).`);
      return;
    }
    if (!name.trim()) {
      setFormError("Enter a geofence name before saving.");
      return;
    }
    setSubmitting("save");
    setFormError(null);
    try {
      const payload = { name: name.trim(), coordinates: cornersToBackend(draftPoints) };
      if (mode === "edit" && editingId) {
        await updateGeofence(editingId, payload);
        flashSuccess(`Geofence "${payload.name}" updated.`);
      } else {
        const res = await createGeofence(payload);
        flashSuccess(`Geofence "${res.data?.name || payload.name}" created.`);
      }
      resetDraft();
      await load();
    } catch (err) {
      setFormError(err.message || "Failed to save geofence.");
    } finally {
      setSubmitting(null);
    }
  }

  async function handleDelete() {
    if (!deleting || submitting) return;
    setSubmitting("delete");
    setFormError(null);
    try {
      const label = geofenceLabel(deleting);
      await deleteGeofence(deleting._id);
      if (editingId === deleting._id) resetDraft();
      if (selectedGeofenceId === deleting._id) setSelectedGeofenceId(null);
      setDeleting(null);
      await load();
      flashSuccess(`Geofence "${label}" deleted.`);
    } catch (err) {
      setFormError(err.message || "Failed to delete geofence.");
    } finally {
      setSubmitting(null);
    }
  }

  async function handleToggleStatus(geofence) {
    if (submitting) return;
    setSubmitting(`status-${geofence._id}`);
    setFormError(null);
    try {
      const next = geofence.status === "active" ? "inactive" : "active";
      await updateGeofence(geofence._id, { status: next });
      await load();
      flashSuccess(`Geofence "${geofence.name}" ${next === "active" ? "enabled" : "disabled"}.`);
    } catch (err) {
      setFormError(err.message || "Failed to update geofence status.");
    } finally {
      setSubmitting(null);
    }
  }

  const filtered = useMemo(() => {
    let list = geofences || [];
    if (filter !== "ALL") {
      list = list.filter((g) => g.status === filter.toLowerCase());
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((g) => g.name?.toLowerCase().includes(q));
    }
    return list;
  }, [geofences, filter, search]);

  const creating = mode === "create";
  const editing = mode === "edit";
  const saveReady = draftPoints.length === REQUIRED_CORNERS && name.trim().length > 0;

  return (
    <div className="page page-map">
      <div className="page-header page-header-compact">
        <div>
          <h2 className="page-title">Geofences</h2>
          <p className="page-desc">
            {geofences.length} zones defined. Draw 4 corners on the map to create a zone.
          </p>
        </div>
        <div className="page-actions">
          {!mode && (
            <button type="button" className="btn btn-primary" onClick={enterCreate}>
              Create Geofence
            </button>
          )}
        </div>
      </div>

      {successMsg && (
        <p className="success-banner" role="status">{successMsg}</p>
      )}
      {formError && !mode && (
        <p className="form-error" role="alert">{formError}</p>
      )}

      <div className="geo-layout">
        <div className="geo-map-card">
          {creating && (
            <p className="geo-instruction" role="status">
              Select {REQUIRED_CORNERS} points on the map to create a geofence ({draftPoints.length}/{REQUIRED_CORNERS}).
            </p>
          )}
          {editing && (
            <p className="geo-instruction" role="status">
              Drag the corners to reshape this geofence, then save.
            </p>
          )}
          <GeofenceEditorMap
            geofences={geofences}
            draftPoints={draftPoints}
            editMode={editing}
            focusedId={selectedGeofenceId}
            focusRequest={focusRequest}
            createMode={creating}
            onMapClick={handleMapClick}
            onCornerDrag={handleCornerDrag}
          />
        </div>

        <aside className="geo-side" aria-label="Geofence management panel">
          {mode && (
            <section className="card" aria-label={creating ? "Create geofence" : "Edit geofence"}>
              <div className="card-header">
                <h3 className="card-title">
                  {creating ? "Create Geofence" : `Edit ${name || "Geofence"}`}
                </h3>
                <span className="card-count">{draftPoints.length}/{REQUIRED_CORNERS} corners</span>
              </div>
              <div className="card-body">
                {formError && (
                  <p className="form-error" role="alert">{formError}</p>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="geofence-name-input">
                    Name <span className="required" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="geofence-name-input"
                    className="input form-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Warehouse Zone"
                    disabled={submitting === "save"}
                  />
                </div>
                <div className="geo-form-actions">
                  {creating && (
                    <>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={handleUndoPoint} disabled={draftPoints.length === 0 || submitting === "save"}>
                        Undo
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={handleClearPoints} disabled={draftPoints.length === 0 || submitting === "save"}>
                        Clear
                      </button>
                    </>
                  )}
                  <button type="button" className="btn btn-ghost btn-sm" onClick={resetDraft} disabled={submitting === "save"}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleSave}
                    disabled={!saveReady || submitting === "save"}
                    title={!saveReady ? "Select 4 corners and enter a name to save" : "Save geofence"}
                  >
                    {submitting === "save" ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </section>
          )}

          <section className="card geo-list-card" aria-label="Geofence list">
            <div className="card-header">
              <h3 className="card-title">Zones</h3>
              <span className="card-count">{filtered.length}</span>
            </div>
            <div className="toolbar geo-toolbar">
              <input
                className="input toolbar-search"
                type="text"
                placeholder="Search zones..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search geofences"
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
            <div className="card-body card-body-flush geo-list">
              {loading ? (
                <div className="empty-padded">
                  <span className="skeleton skeleton-line" />
                  <span className="skeleton skeleton-line" />
                  <span className="skeleton skeleton-line" />
                </div>
              ) : error ? (
                <p className="empty-text empty-padded">Failed to load geofences: {error}</p>
              ) : filtered.length === 0 ? (
                <div className="empty-padded">
                  <p className="empty-text">No geofences found.</p>
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
                <ul className="mini-list">
                  {filtered.map((g) => {
                    const isActive = g.status === "active";
                    const isSelected = selectedGeofenceId === g._id;
                    return (
                      <li className={`mini-list-item geo-list-item${isSelected ? " selected" : ""}`} key={g._id}>
                        <span className="mini-list-main">
                          <button
                            type="button"
                            className={`geo-name-btn${isSelected ? " active" : ""}`}
                            onClick={() => handleSelectGeofence(g._id)}
                            aria-pressed={isSelected}
                            title={`Select ${geofenceLabel(g)} on the map`}
                          >
                            {geofenceLabel(g)}
                          </button>
                          <span className="mini-list-sub">
                            {countCorners(g)} corners · {g.status || "unknown"}
                            {isSelected && <span className="geo-selected-tag">Selected</span>}
                          </span>
                        </span>
                        <span className={`fleet-item-status ${isActive ? "status-active" : "status-inactive"}`}>
                          {g.status || "unknown"}
                        </span>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleToggleStatus(g)}
                            disabled={submitting !== null}
                            title={isActive ? "Disable this zone" : "Enable this zone"}
                          >
                            {submitting === `status-${g._id}` ? "..." : isActive ? "Disable" : "Enable"}
                          </button>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => enterEdit(g)} disabled={submitting !== null}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-danger"
                            onClick={() => setDeleting(g)}
                            disabled={submitting !== null}
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </aside>
      </div>

      {deleting && (
        <ConfirmModal
          title="Delete Geofence"
          message={`Permanently delete the zone "${geofenceLabel(deleting)}"? Historical alerts are kept. This cannot be undone.`}
          confirmLabel="Delete Geofence"
          submitting={submitting === "delete"}
          serverError={formError}
          onConfirm={handleDelete}
          onClose={() => { if (submitting !== "delete") { setDeleting(null); setFormError(null); } }}
        />
      )}
    </div>
  );
}

export default GeofencesPage;
