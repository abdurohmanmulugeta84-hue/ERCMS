import React from 'react';

/**
 * Displays a dismissible error alert.
 *
 * @param {string|object} error   — error string or DRF error object
 * @param {Function}      onDismiss — optional dismiss callback
 */
export default function ErrorMessage({ error, onDismiss }) {
  if (!error) return null;

  // DRF can return errors as { field: ["message"] } or { detail: "message" }
  let messages = [];
  if (typeof error === 'string') {
    messages = [error];
  } else if (error?.detail) {
    messages = [error.detail];
  } else if (typeof error === 'object') {
    messages = Object.entries(error).flatMap(([field, msgs]) => {
      const label = field === 'non_field_errors' ? '' : `${field}: `;
      return Array.isArray(msgs) ? msgs.map((m) => `${label}${m}`) : [`${label}${msgs}`];
    });
  }

  return (
    <div
      className={`alert alert-danger ${onDismiss ? 'alert-dismissible' : ''} mb-3`}
      role="alert"
    >
      {messages.length === 1 ? (
        <span>{messages[0]}</span>
      ) : (
        <ul className="mb-0 ps-3">
          {messages.map((m, i) => <li key={i}>{m}</li>)}
        </ul>
      )}
      {onDismiss && (
        <button
          type="button"
          className="btn-close"
          aria-label="Dismiss error"
          onClick={onDismiss}
        />
      )}
    </div>
  );
}
