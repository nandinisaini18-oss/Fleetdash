import { useState, useEffect, useRef } from "react";

const STATUS_OPTIONS = ["active", "inactive", "maintenance"];

function VehicleModal({ mode, vehicle, submitting, serverError, onSubmit, onClose }) {
  const isEdit = mode === "edit";
  const [vehicleId, setVehicleId] = useState(vehicle?.vehicleId || "");
  const [registrationNumber, setRegistrationNumber] = useState(vehicle?.registrationNumber || "");
  const [driverName, setDriverName] = useState(vehicle?.driverName || "");
  const [status, setStatus] = useState(vehicle?.status || "active");
  const [fieldErrors, setFieldErrors] = useState({});
  const firstInputRef = useRef(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    const errors = {};
    if (!isEdit && !vehicleId.trim()) errors.vehicleId = "Vehicle ID is required.";
    if (!registrationNumber.trim()) errors.registrationNumber = "Registration number is required.";
    if (isEdit && !STATUS_OPTIONS.includes(status)) errors.status = "Select a valid status.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (isEdit) {
      onSubmit({
        registrationNumber: registrationNumber.trim(),
        driverName: driverName.trim(),
        status,
      });
    } else {
      const payload = {
        vehicleId: vehicleId.trim(),
        registrationNumber: registrationNumber.trim(),
      };
      if (driverName.trim()) payload.driverName = driverName.trim();
      onSubmit(payload);
    }
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Edit vehicle" : "Add vehicle"}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">{isEdit ? "Edit Vehicle" : "Add Vehicle"}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog">
            &#x2715;
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {serverError && (
              <p className="form-error" role="alert">{serverError}</p>
            )}
            {!isEdit && (
              <div className="form-group">
                <label className="form-label" htmlFor="vehicle-id-input">
                  Vehicle ID <span className="required" aria-hidden="true">*</span>
                </label>
                <input
                  id="vehicle-id-input"
                  ref={firstInputRef}
                  className={`input form-input${fieldErrors.vehicleId ? " input-error" : ""}`}
                  type="text"
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  placeholder="e.g. VH-1001"
                  disabled={submitting}
                  aria-invalid={Boolean(fieldErrors.vehicleId)}
                />
                {fieldErrors.vehicleId && <span className="field-error">{fieldErrors.vehicleId}</span>}
                <span className="form-hint">Business identifier shown across the dashboard. Cannot be changed later.</span>
              </div>
            )}
            <div className="form-group">
              <label className="form-label" htmlFor="vehicle-reg-input">
                Registration Number <span className="required" aria-hidden="true">*</span>
              </label>
              <input
                id="vehicle-reg-input"
                ref={isEdit ? firstInputRef : undefined}
                className={`input form-input${fieldErrors.registrationNumber ? " input-error" : ""}`}
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="e.g. MP 09 AB 1234"
                disabled={submitting}
                aria-invalid={Boolean(fieldErrors.registrationNumber)}
              />
              {fieldErrors.registrationNumber && <span className="field-error">{fieldErrors.registrationNumber}</span>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="vehicle-driver-input">Driver Name</label>
              <input
                id="vehicle-driver-input"
                className="input form-input"
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Optional"
                disabled={submitting}
              />
            </div>
            {isEdit ? (
              <div className="form-group">
                <label className="form-label" htmlFor="vehicle-status-input">Status</label>
                <select
                  id="vehicle-status-input"
                  className="input form-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={submitting}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {fieldErrors.status && <span className="field-error">{fieldErrors.status}</span>}
                <span className="form-hint">Only active vehicles generate live telemetry.</span>
              </div>
            ) : (
              <p className="form-hint">New vehicles start with status active unless the backend assigns otherwise.</p>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Save Changes" : "Create Vehicle")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default VehicleModal;
