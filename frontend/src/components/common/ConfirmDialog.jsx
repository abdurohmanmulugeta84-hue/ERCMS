import React from 'react';

/**
 * A Bootstrap modal confirmation dialog.
 *
 * Props:
 *   show         — boolean, controls visibility
 *   title        — dialog title
 *   message      — confirmation message
 *   confirmLabel — text for the confirm button (default: "Confirm")
 *   confirmStyle — Bootstrap button variant (default: "danger")
 *   onConfirm    — callback when confirmed
 *   onCancel     — callback when cancelled
 *   isLoading    — disable buttons while an async operation runs
 */
export default function ConfirmDialog({
  show,
  title = 'Confirm Action',
  message,
  confirmLabel = 'Confirm',
  confirmStyle = 'danger',
  onConfirm,
  onCancel,
  isLoading = false,
}) {
  if (!show) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="modal-backdrop fade show"
        onClick={onCancel}
        aria-hidden="true"
      />
      {/* Dialog */}
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmDialogTitle"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="confirmDialogTitle">{title}</h5>
              <button
                type="button"
                className="btn-close"
                onClick={onCancel}
                disabled={isLoading}
                aria-label="Close"
              />
            </div>
            <div className="modal-body">
              <p className="mb-0">{message}</p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn btn-${confirmStyle}`}
                onClick={onConfirm}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                    Processing…
                  </>
                ) : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
