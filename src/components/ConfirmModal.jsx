import { useEffect, useRef } from "react";

function ConfirmModal({ title, message, confirmLabel, submitting, serverError, onConfirm, onClose }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div
        className="modal modal-narrow"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog">
            &#x2715;
          </button>
        </div>
        <div className="modal-body">
          {serverError && (
            <p className="form-error" role="alert">{serverError}</p>
          )}
          <p className="modal-text">{message}</p>
        </div>
        <div className="modal-footer modal-footer-danger">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            ref={confirmRef}
            className="btn btn-danger-solid"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
