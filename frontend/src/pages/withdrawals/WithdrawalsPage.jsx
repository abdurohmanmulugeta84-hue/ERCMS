/**
 * WithdrawalsPage — Organizer / Admin view.
 * Lists all withdrawal requests with approve/reject modal.
 */
import React, { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { listWithdrawals, reviewWithdrawal } from '../../api/withdrawalsApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import StatusBadge from '../../components/common/StatusBadge';

function ReviewModal({ request, onDone, onClose }) {
  const [action, setAction] = useState('approve');
  const [note, setNote]     = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await reviewWithdrawal(request.id, { action, review_note: note });
      onDone();
    } catch (err) {
      setError(err?.response?.data || 'Failed to process review.');
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
              <h5 className="modal-title">Review Withdrawal Request</h5>
              <button type="button" className="btn-close" onClick={onClose} disabled={saving} aria-label="Close" />
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="p-3 bg-light rounded small mb-3">
                  <div><strong>Member:</strong> {request.member_name}</div>
                  <div><strong>Equb:</strong> {request.equb_name}</div>
                  <div><strong>Reason:</strong> {request.reason}</div>
                </div>
                <ErrorMessage error={error} onDismiss={() => setError(null)} />
                <div className="mb-3">
                  <label className="form-label fw-semibold">Decision</label>
                  <div className="d-flex gap-4">
                    {['approve', 'reject'].map(a => (
                      <div className="form-check" key={a}>
                        <input type="radio" className="form-check-input" id={`wr_${a}`}
                          name="wr_action" value={a} checked={action === a}
                          onChange={() => setAction(a)} disabled={saving} />
                        <label className="form-check-label text-capitalize" htmlFor={`wr_${a}`}>{a}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="wr_note" className="form-label fw-semibold">
                    Review Note <span className="text-muted fw-normal">(optional)</span>
                  </label>
                  <textarea id="wr_note" className="form-control" rows={2}
                    value={note} onChange={e => setNote(e.target.value)}
                    disabled={saving} placeholder="Reason for decision…" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
                <button type="submit"
                  className={`btn btn-${action === 'approve' ? 'success' : 'danger'}`}
                  disabled={saving}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-2" />Processing…</>
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

export default function WithdrawalsPage() {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [reviewTarget, setReviewTarget] = useState(null);

  const { data: requests, isLoading, error, refetch } = useFetch(listWithdrawals, []);

  const displayed = (requests || []).filter(
    r => statusFilter === 'all' || r.status === statusFilter
  );
  const pendingCount = (requests || []).filter(r => r.status === 'pending').length;

  return (
    <div>
      <div className="ercms-page-header">
        <h1>Withdrawal Requests</h1>
        <p className="text-muted mb-0">Review member requests to withdraw from Equb groups.</p>
      </div>

      <div className="mb-3 d-flex gap-2 flex-wrap">
        {['pending', 'approved', 'rejected', 'all'].map(s => (
          <button key={s}
            className={`btn btn-sm ${statusFilter === s ? 'btn-dark' : 'btn-outline-secondary'}`}
            onClick={() => setStatusFilter(s)}>
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            {s === 'pending' && pendingCount > 0 && (
              <span className="badge bg-warning text-dark ms-1">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading && <LoadingSpinner message="Loading requests…" />}
      {error && <ErrorMessage error={error} />}

      {!isLoading && !error && (
        displayed.length === 0 ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5">
              <i className="bi bi-box-arrow-left text-muted" style={{ fontSize: '2.5rem' }} aria-hidden="true" />
              <p className="text-muted mt-2 mb-0">No {statusFilter !== 'all' ? statusFilter : ''} withdrawal requests.</p>
            </div>
          </div>
        ) : (
          <div className="card border-0 shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr><th>Member</th><th>Equb</th><th>Reason</th><th>Status</th><th>Submitted</th><th></th></tr>
                </thead>
                <tbody>
                  {displayed.map(r => (
                    <tr key={r.id}>
                      <td className="fw-semibold">{r.member_name}</td>
                      <td>{r.equb_name}</td>
                      <td className="text-muted small" style={{ maxWidth: 200 }}>
                        <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {r.reason}
                        </span>
                      </td>
                      <td><StatusBadge status={r.status} /></td>
                      <td className="text-muted small">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td>
                        {r.status === 'pending' && (
                          <button className="btn btn-sm btn-outline-primary" onClick={() => setReviewTarget(r)}>
                            Review
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {reviewTarget && (
        <ReviewModal
          request={reviewTarget}
          onDone={async () => { await refetch(); setReviewTarget(null); }}
          onClose={() => setReviewTarget(null)}
        />
      )}
    </div>
  );
}
