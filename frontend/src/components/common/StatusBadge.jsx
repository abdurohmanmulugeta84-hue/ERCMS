import React from 'react';

/** Maps status strings to Bootstrap colour classes */
const STATUS_COLOURS = {
  // Generic
  active: 'success',
  inactive: 'secondary',
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  // Contribution / Payment
  verified: 'success',
  submitted: 'info',
  // Payout
  processed: 'success',
  scheduled: 'primary',
  // Membership
  suspended: 'warning',
  exited: 'secondary',
  // Meeting
  completed: 'success',
  cancelled: 'danger',
  upcoming: 'info',
};

/**
 * Renders a Bootstrap badge with a colour mapped to the status.
 *
 * @param {string} status   — status string (case-insensitive)
 * @param {string} label    — display text (defaults to capitalised status)
 */
export default function StatusBadge({ status, label }) {
  const key = status?.toLowerCase() ?? '';
  const colour = STATUS_COLOURS[key] ?? 'secondary';
  const displayLabel = label ?? (status ? status.charAt(0).toUpperCase() + status.slice(1) : '—');

  return (
    <span className={`badge bg-${colour}`}>{displayLabel}</span>
  );
}
