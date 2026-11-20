/**
 * MyEqubsPage — for Equb Members.
 *
 * Shows the member's own memberships with Equb details, status, and
 * allows them to request membership in any active Equb.
 */
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { getMyMemberships, requestMembership } from '../../api/membershipsApi';
import { listEqubs } from '../../api/equbsApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import StatusBadge from '../../components/common/StatusBadge';

// ── Join Request Modal ────────────────────────────────────────────────────────
function JoinModal({ equbs, myMemberships, onDone, onClose }) {
  const [equbId, setEqubId] = useState('');
  const [note, setNote]     = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);
  const [success, setSuccess] = useState(false);

  // Equbs user hasn't joined yet (exclude pending/approved)
  const joinedEqubIds = new Set(
    (myMemberships || [])
      .filter(m => ['pending', 'approved'].includes(m.status))
      .map(m => m.equb)
  );
  const available = (equbs || []).filter(
    e => (e.status === 'active' || e.status === 'draft') && !joinedEqubIds.has(e.id)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!equbId) { setError('Please select an Equb to join.'); return; }
    setSaving(true);
    setError(null);
    try {
      await requestMembership({ equb: Number(equbId), request_note: note });
      setSuccess(true);
    } catch (err) {
      setError(err?.response?.data || 'Failed to submit membership request.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show" onClick={!saving ? onClose : undefined} aria-hidden="true" />
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Join an Equb Group</h5>
              <button type="button" className="btn-close" onClick={onClose} disabled={saving} aria-label="Close" />
            </div>
            {success ? (
              <div className="modal-body text-center py-4">
                <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '2.5rem' }} aria-hidden="true" />
                <h6 className="mt-3">Request Submitted!</h6>
                <p className="text-muted small">Your membership request is pending approval by the Organizer.</p>
                <button className="btn btn-ercms-primary mt-1" onClick={() => { onDone(); onClose(); }}>
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <ErrorMessage error={error} onDismiss={() => setError(null)} />
                  {available.length === 0 ? (
                    <p className="text-muted mb-0">No Equb groups available to join right now.</p>
                  ) : (
                    <>
                      <div className="mb-3">
                        <label htmlFor="join_equb" className="form-label fw-semibold">
                          Select Equb Group <span className="text-danger">*</span>
                        </label>
                        <select id="join_equb" className="form-select" value={equbId}
                          onChange={e => setEqubId(e.target.value)} disabled={saving}>
                          <option value="">— Choose an Equb —</option>
                          {available.map(e => (
                            <option key={e.id} value={e.id}>
                              {e.name} — ETB {Number(e.contribution_amount).toLocaleString()} / {e.frequency_display}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="join_note" className="form-label fw-semibold">
                          Note <span className="text-muted fw-normal">(optional)</span>
                        </label>
                        <textarea id="join_note" className="form-control" rows={2}
                          value={note} onChange={e => setNote(e.target.value)}
                          disabled={saving} placeholder="Introduce yourself to the Organizer…" />
                      </div>
                    </>
                  )}
                </div>
                {available.length > 0 && (
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
                    <button type="submit" className="btn btn-ercms-primary" disabled={saving || !equbId}>
                      {saving
                        ? <><span className="spinner-border spinner-border-sm me-2" />Submitting…</>
                        : 'Request Membership'}
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MyEqubsPage() {
  const { user } = useAuth();
  const [showJoin, setShowJoin] = useState(false);

  const { data: memberships, isLoading, error, refetch } = useFetch(getMyMemberships, []);
  const { data: equbs } = useFetch(listEqubs, []);

  return (
    <div>
      <div className="ercms-page-header d-flex justify-content-between align-items-center">
        <div>
          <h1>My Equb Groups</h1>
          <p className="text-muted mb-0">Your Equb memberships and participation status.</p>
        </div>
        <button className="btn btn-ercms-primary" onClick={() => setShowJoin(true)}>
          <i className="bi bi-plus-circle me-2" aria-hidden="true" />Join an Equb
        </button>
      </div>

      {isLoading && <LoadingSpinner message="Loading your memberships…" />}
      {error && <ErrorMessage error={error} />}

      {!isLoading && !error && (
        <>
          {(!memberships || memberships.length === 0) ? (
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center py-5">
                <i className="bi bi-collection text-muted" style={{ fontSize: '2.5rem' }} aria-hidden="true" />
                <h6 className="mt-3 text-muted">You are not in any Equb group yet.</h6>
                <button className="btn btn-ercms-primary mt-2" onClick={() => setShowJoin(true)}>
                  Join an Equb Group
                </button>
              </div>
            </div>
          ) : (
            <div className="row g-3">
              {memberships.map(m => (
                <div className="col-12 col-md-6 col-lg-4" key={m.id}>
                  <div className="card border-0 shadow-sm h-100 ercms-stat-card">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h6 className="fw-bold mb-0">{m.equb_name}</h6>
                        <StatusBadge status={m.status} />
                      </div>
                      <dl className="row small mb-0">
                        {m.rotation_position != null && (
                          <>
                            <dt className="col-6 text-muted">Rotation position</dt>
                            <dd className="col-6">{m.rotation_position}</dd>
                          </>
                        )}
                        <dt className="col-6 text-muted">Membership status</dt>
                        <dd className="col-6">{m.status_display}</dd>
                        <dt className="col-6 text-muted">Joined on</dt>
                        <dd className="col-6">{new Date(m.created_at).toLocaleDateString()}</dd>
                        {m.review_note && (
                          <>
                            <dt className="col-6 text-muted">Note</dt>
                            <dd className="col-6">{m.review_note}</dd>
                          </>
                        )}
                      </dl>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showJoin && (
        <JoinModal
          equbs={equbs}
          myMemberships={memberships}
          onDone={refetch}
          onClose={() => setShowJoin(false)}
        />
      )}
    </div>
  );
}
