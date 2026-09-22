import { useEffect, useRef } from "react";

function VehicleDeleteModal({ vehicle, submitting, serverError, onConfirm, onClose }) {
  const deleteRef = useRef(null);

  useEffect(() => {
    deleteRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!vehicle) return null;

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div
        className="modal modal-narrow"
        role="alertdialog"
        aria-modal="true"
        aria-label="Confirm vehicle deletion"
        aria-describedby="delete-vehicle-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">Delete Vehicle</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog">
            &#x2715;
          </button>
        </div>
        <div className="modal-body">
          {serverError && (
            <p className="form-error" role="alert">{serverError}</p>
          )}
          <p className="modal-text" id="delete-vehicle-desc">
            Permanently delete <strong className="mono">{vehicle.registrationNumber || vehicle.vehicleId || vehicle._id}</strong>
            {vehicle.driverName ? ` (driver ${vehicle.driverName})` : ""}? Live telemetry
            simulation for this vehicle stops immediately. This cannot be undone.
          </p>
        </div>
        <div className="modal-footer modal-footer-danger">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            ref={deleteRef}
            className="btn btn-danger-solid"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? "Deleting..." : "Delete Vehicle"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default VehicleDeleteModal;
