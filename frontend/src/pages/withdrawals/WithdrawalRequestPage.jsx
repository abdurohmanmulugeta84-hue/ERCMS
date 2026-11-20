/**
 * WithdrawalRequestPage — Member view.
 * Submit new requests and track existing ones.
 */
import React, { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { listWithdrawals, requestWithdrawal } from '../../api/withdrawalsApi';
import { getMyMemberships } from '../../api/membershipsApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import StatusBadge from '../../components/common/StatusBadge';

export default function WithdrawalRequestPage() {
  const [tab, setTab]     = useState('history');
  const [form, setForm]   = useState({ membership: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);
  const [success, setSuccess] = useState(null);

  const { data: myRequests, isLoading, error: fetchError, refetch } = useFetch(listWithdrawals, []);
  const { data: memberships } = useFetch(getMyMemberships, []);

  const activeMemberships = (memberships || []).filter(m => m.status === 'approved');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await requestWithdrawal({ membership: Number(form.membership), reason: form.reason });
      setSuccess(`Your withdrawal request has been submitted. The Organizer will review it shortly.`);
      setForm({ membership: '', reason: '' });
      refetch();
    } catch (err) {
      setError(err?.response?.data || 'Failed to submit request.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="ercms-page-header">
        <h1>Withdrawal Requests</h1>
        <p className="text-muted mb-0">Request to withdraw from an Equb group.</p>
      </div>

      <ul className="nav nav-tabs mb-3">
        {[{ key: 'history', label: 'My Requests' }, { key: 'submit', label: 'New Request' }].map(t => (
          <li className="nav-item" key={t.key}>
            <button className={`nav-link ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
          </li>
        ))}
      </ul>

      {tab === 'history' && (
        <>
          {isLoading && <LoadingSpinner />}
          {fetchError && <ErrorMessage error={fetchError} />}
          {!isLoading && !fetchError && (
            (!myRequests || myRequests.length === 0) ? (
              <div className="card border-0 shadow-sm">
                <div className="card-body text-center py-5">
                  <i className="bi bi-box-arrow-left text-muted" style={{ fontSize: '2.5rem' }} />
                  <p className="text-muted mt-2 mb-0">You have no withdrawal requests.</p>
                  <button className="btn btn-ercms-primary mt-3" onClick={() => setTab('submit')}>
                    Submit a request
                  </button>
                </div>
              </div>
            ) : (
              <div className="card border-0 shadow-sm">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr><th>Equb</th><th>Reason</th><th>Status</th><th>Review Note</th><th>Submitted</th></tr>
                    </thead>
                    <tbody>
                      {myRequests.map(r => (
                        <tr key={r.id}>
                          <td className="fw-semibold">{r.equb_name}</td>
                          <td className="text-muted small">{r.reason}</td>
                          <td><StatusBadge status={r.status} /></td>
                          <td className="text-muted small">{r.review_note || '—'}</td>
                          <td className="text-muted small">{new Date(r.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </>
      )}

      {tab === 'submit' && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white fw-semibold">Request Withdrawal from an Equb Group</div>
          <div className="card-body">
            {success && (
              <div className="alert alert-success d-flex align-items-center gap-2">
                <i className="bi bi-check-circle-fill" />{success}
              </div>
            )}
            <ErrorMessage error={error} onDismiss={() => setError(null)} />
            {activeMemberships.length === 0 ? (
              <p className="text-muted">You don't have any active memberships to withdraw from.</p>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-3">
                  <label htmlFor="wr_mem" className="form-label fw-semibold">
                    Equb Group <span className="text-danger">*</span>
                  </label>
                  <select id="wr_mem" className="form-select" value={form.membership}
                    onChange={e => setForm(p => ({ ...p, membership: e.target.value }))}
                    disabled={saving} required>
                    <option value="">— Select Equb to withdraw from —</option>
                    {activeMemberships.map(m => (
                      <option key={m.id} value={m.id}>{m.equb_name}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label htmlFor="wr_reason" className="form-label fw-semibold">
                    Reason <span className="text-danger">*</span>
                  </label>
                  <textarea id="wr_reason" className="form-control" rows={3}
                    value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                    disabled={saving} required placeholder="Please explain why you are requesting to withdraw…" />
                </div>
                <div className="alert alert-warning small py-2 mb-3">
                  <i className="bi bi-exclamation-triangle me-1" />
                  Submitting a withdrawal request does not automatically remove you from the Equb. The Organizer must approve it.
                </div>
                <button type="submit" className="btn btn-ercms-primary"
                  disabled={saving || !form.membership || !form.reason.trim()}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-2" />Submitting…</> : 'Submit Request'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
