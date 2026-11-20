import React from 'react';

/**
 * Loading spinner with an optional message.
 *
 * @param {string}  message  — text shown below the spinner (default: "Loading…")
 * @param {string}  size     — "sm" | "md" (default: "md")
 */
export default function LoadingSpinner({ message = 'Loading…', size = 'md' }) {
  const spinnerClass = size === 'sm' ? 'spinner-border spinner-border-sm' : 'spinner-border';
  return (
    <div className="d-flex flex-column align-items-center gap-2 py-4" role="status" aria-live="polite">
      <div className={spinnerClass} style={{ color: 'var(--ercms-primary)' }}>
        <span className="visually-hidden">Loading</span>
      </div>
      {message && <p className="text-muted small mb-0">{message}</p>}
    </div>
  );
}
