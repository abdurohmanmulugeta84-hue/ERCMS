/**
 * MembershipsPage — for Organizers and Admins.
 *
 * Shows memberships (filtered by Equb if ?equb=<id> is in the URL).
 * Allows approve/reject of pending requests and suspend/exit of approved members.
 */
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import {
  listMemberships, reviewMembership, updateMembershipStatus,
} from '../../api/membershipsApi';
import { listEqubs } from '../../api/equbsApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';

// ── Review modal ──────────────────────────────────────────────────────────────
function ReviewModal({ membership, onDone, onClose }) {
  const [action, setAction] = useState('approve');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await reviewMembership(membership.id, { action, review_note: note });
      onDone();
    } catch (err) {
      setError(err?.response?.data || 'Failed to review membership.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} aria-hidden="true" />
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Review Membership</h5>
              <button type="button" className="btn-close" onClick={onClose} disabled={saving} aria-label="Close" />
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <p className="mb-3">
                  <strong>{membership.user_full_name}</strong> requesting to join <strong>{membership.equb_name}</strong>
                </p>
                <ErrorMessage error={error} />
                <div className="mb-3">
                  <label className="form-label fw-semibold">Decision</label>
                  <div className="d-flex gap-3">
                    {['approve', 'reject'].map(a => (
                      <div className="form-check" key={a}>
                        <input
                          type="radio" className="form-check-input" name="action"
                          id={`action_${a}`} value={a} checked={action === a}
                          onChange={() => setAction(a)} disabled={saving}
                        />
                        <label className="form-check-label text-capitalize" htmlFor={`action_${a}`}>{a}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="review_note" className="form-label fw-semibold">
                    Note <span className="text-muted fw-normal">(optional)</span>
                  </label>
                  <textarea id="review_note" className="form-control" rows={2}
                    value={note} onChange={e => setNote(e.target.value)} disabled={saving}
                    placeholder="Reason for approval or rejection…" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
                <button
                  type="submit"
                  className={`btn btn-${action === 'approve' ? 'success' : 'danger'}`}
                  disabled={saving}
                >
                  {saving
                    ? <><span className="spinner-border spinner-border-sm me-2" />Processing…</>
                    : action === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MembershipsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const equbIdFilter = searchParams.get('equb');

  const [statusFilter, setStatusFilter] = useState('all');
  const [reviewTarget, setReviewTarget] = useState(null);
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSaving, setActionSaving] = useState(false);

  const fetchFn = () => listMemberships(equbIdFilter ? { equb: equbIdFilter } : {});
  const { data: memberships, isLoading, error, refetch } = useFetch(fetchFn, [equbIdFilter]);

  // Filter by status client-side
  const displayed = memberships
    ? statusFilter === 'all'
      ? memberships
      : memberships.filter(m => m.status === statusFilter)
    : [];

  const handleSuspend = async () => {
    setActionSaving(true);
    setActionError(null);
    try {
      await updateMembershipStatus(suspendTarget.id, { status: 'suspended' });
      await refetch();
      setSuspendTarget(null);
    } catch (err) {
      setActionError(err?.response?.data?.status?.[0] || 'Failed to suspend membership.');
    } finally {
      setActionSaving(false);
    }
  };

  const handleRestore = async (membership) => {
    setActionError(null);
    try {
      await updateMembershipStatus(membership.id, { status: 'approved' });
      await refetch();
    } catch (err) {
      setActionError(err?.response?.data?.status?.[0] || 'Failed to restore membership.');
    }
  };

  const STATUS_TABS = ['all', 'pending', 'approved', 'rejected', 'suspended', 'exited'];

  return (
    <div>
      <div className="ercms-page-header">
        <h1>Memberships</h1>
        <p className="text-muted mb-0">
          {equbIdFilter ? `Showing members for Equb #${equbIdFilter}` : 'All membership records across your Equb groups.'}
        </p>
      </div>

      {actionError && <ErrorMessage error={actionError} onDismiss={() => setActionError(null)} />}

      {/* Status tab filter */}
      <div className="mb-3">
        <ul className="nav nav-pills gap-1 flex-wrap">
          {STATUS_TABS.map(s => (
            <li className="nav-item" key={s}>
              <button
                className={`nav-link py-1 px-3 ${statusFilter === s ? 'active' : ''}`}
                style={statusFilter === s ? { backgroundColor: 'var(--ercms-primary)' } : {}}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                {memberships && s !== 'all' && (
                  <span className="ms-1 badge bg-white text-dark">
                    {memberships.filter(m => m.status === s).length}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {isLoading && <LoadingSpinner message="Loading memberships…" />}
      {error && <ErrorMessage error={error} />}

      {!isLoading && !error && (
        <>
          {displayed.length === 0 ? (
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center py-5">
                <i className="bi bi-person-badge text-muted" style={{ fontSize: '2.5rem' }} aria-hidden="true" />
                <p className="text-muted mt-2 mb-0">No memberships found.</p>
              </div>
            </div>
          ) : (
            <div className="card border-0 shadow-sm">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Member</th>
                      <th>Email</th>
                      <th>Equb Group</th>
                      <th>Status</th>
                      <th>Rotation Pos.</th>
                      <th>Requested</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.map(m => (
                      <tr key={m.id}>
                        <td className="fw-semibold">{m.user_full_name}</td>
                        <td className="text-muted small">{m.user_email}</td>
                        <td>{m.equb_name}</td>
                        <td><StatusBadge status={m.status} /></td>
                        <td>{m.rotation_position ?? '—'}</td>
                        <td className="text-muted small">{new Date(m.created_at).toLocaleDateString()}</td>
                        <td>
                          <div className="d-flex gap-1 flex-wrap">
                            {m.status === 'pending' && (
                              <button
                                className="btn btn-sm btn-outline-success"
                                onClick={() => setReviewTarget(m)}
                              >
                                Review
                              </button>
                            )}
                            {m.status === 'approved' && (
                              <button
                                className="btn btn-sm btn-outline-warning"
                                onClick={() => setSuspendTarget(m)}
                              >
                                Suspend
                              </button>
                            )}
                            {m.status === 'suspended' && (
                              <button
                                className="btn btn-sm btn-outline-success"
                                onClick={() => handleRestore(m)}
                              >
                                Restore
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Review modal */}
      {reviewTarget && (
        <ReviewModal
          membership={reviewTarget}
          onDone={async () => { await refetch(); setReviewTarget(null); }}
          onClose={() => setReviewTarget(null)}
        />
      )}

      {/* Suspend confirm */}
      <ConfirmDialog
        show={!!suspendTarget}
        title="Suspend Membership"
        message={`Suspend ${suspendTarget?.user_full_name}'s membership in ${suspendTarget?.equb_name}?`}
        confirmLabel="Suspend"
        confirmStyle="warning"
        isLoading={actionSaving}
        onConfirm={handleSuspend}
        onCancel={() => setSuspendTarget(null)}
      />
    </div>
  );
}
