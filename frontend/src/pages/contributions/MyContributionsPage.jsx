/**
 * MyContributionsPage — Equb Member view.
 *
 * Two tabs:
 *   History  — member's own contribution records with status
 *   Submit   — form for the member to submit a contribution
 */
import React, { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { listContributions, submitContribution } from '../../api/contributionsApi';
import { getMyMemberships } from '../../api/membershipsApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import StatusBadge from '../../components/common/StatusBadge';

// ── Submit Contribution form ───────────────────────────────────────────────────
function SubmitContributionForm({ memberships, onSaved }) {
  const [form, setForm]   = useState({ membership: '', amount: '', period_label: '', notes: '' });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);
  const [success, setSuccess] = useState(null);

  const set = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const activeMemberships = (memberships || []).filter(m => m.status === 'approved');

  const handleMembershipChange = (e) => {
    const id = e.target.value;
    const found = memberships?.find(m => String(m.id) === id);
    // Could pre-fill amount from equb info if available — left for user to enter
    setForm(p => ({ ...p, membership: id, amount: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await submitContribution({
        membership: Number(form.membership),
        amount: form.amount,
        period_label: form.period_label,
        notes: form.notes,
      });
      setSuccess(`Your contribution has been submitted. Reference: ${result.transaction_reference}`);
      setForm({ membership: form.membership, amount: '', period_label: '', notes: '' });
      onSaved();
    } catch (err) {
      setError(err?.response?.data || 'Failed to submit contribution.');
    } finally {
      setSaving(false);
    }
  };

  if (activeMemberships.length === 0) {
    return (
      <div className="card border-0 shadow-sm">
        <div className="card-body text-center py-5">
          <i className="bi bi-collection text-muted" style={{ fontSize: '2.5rem' }} aria-hidden="true" />
          <p className="text-muted mt-2 mb-0">
            You don't have any approved Equb memberships to submit contributions for.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white fw-semibold">Submit a Contribution</div>
      <div className="card-body">
        {success && (
          <div className="alert alert-success d-flex align-items-center gap-2" role="status">
            <i className="bi bi-check-circle-fill" aria-hidden="true" />
            <span>{success}</span>
          </div>
        )}
        <ErrorMessage error={error} onDismiss={() => setError(null)} />
        <form onSubmit={handleSubmit} noValidate>
          <div className="row g-3">
            <div className="col-md-6">
              <label htmlFor="sc_membership" className="form-label fw-semibold">
                Equb Group <span className="text-danger">*</span>
              </label>
              <select id="sc_membership" name="membership" className="form-select"
                value={form.membership} onChange={handleMembershipChange} disabled={saving} required>
                <option value="">— Select your Equb —</option>
                {activeMemberships.map(m => (
                  <option key={m.id} value={m.id}>{m.equb_name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label htmlFor="sc_period" className="form-label fw-semibold">
                Period <span className="text-danger">*</span>
              </label>
              <input id="sc_period" name="period_label" type="text" className="form-control"
                value={form.period_label} onChange={set} disabled={saving}
                placeholder="e.g. 2026-10" required />
              <div className="form-text">The cycle this payment covers.</div>
            </div>
            <div className="col-md-3">
              <label htmlFor="sc_amount" className="form-label fw-semibold">
                Amount (ETB) <span className="text-danger">*</span>
              </label>
              <input id="sc_amount" name="amount" type="number" min="1" step="0.01"
                className="form-control" value={form.amount} onChange={set}
                disabled={saving} required />
            </div>
            <div className="col-12">
              <label htmlFor="sc_notes" className="form-label fw-semibold">
                Notes <span className="text-muted fw-normal">(optional)</span>
              </label>
              <input id="sc_notes" name="notes" type="text" className="form-control"
                value={form.notes} onChange={set} disabled={saving}
                placeholder="e.g. Paid via bank transfer on 2026-10-01" />
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-ercms-primary mt-4"
            disabled={saving || !form.membership || !form.period_label || !form.amount}
          >
            {saving
              ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Submitting…</>
              : 'Submit Contribution'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MyContributionsPage() {
  const [tab, setTab] = useState('history');

  const { data: contributions, isLoading, error, refetch } = useFetch(listContributions, []);
  const { data: memberships }  = useFetch(getMyMemberships, []);

  // Summary counts
  const verified    = (contributions || []).filter(c => c.status === 'verified').length;
  const submitted   = (contributions || []).filter(c => c.status === 'submitted').length;
  const rejected    = (contributions || []).filter(c => c.status === 'rejected').length;
  const outstanding = (contributions || []).filter(c => c.status === 'outstanding').length;

  return (
    <div>
      <div className="ercms-page-header">
        <h1>My Contributions</h1>
        <p className="text-muted mb-0">View your contribution history and submit new contributions.</p>
      </div>

      {/* Summary row */}
      {contributions && contributions.length > 0 && (
        <div className="row g-3 mb-4">
          {[
            { label: 'Total',       value: contributions.length, colour: 'secondary' },
            { label: 'Verified',    value: verified,             colour: 'success'   },
            { label: 'Pending',     value: submitted,            colour: 'warning'   },
            { label: 'Outstanding', value: outstanding,          colour: 'danger'    },
          ].map(s => (
            <div className="col-6 col-md-3" key={s.label}>
              <div className={`card border-0 shadow-sm border-start border-4 border-${s.colour}`}>
                <div className="card-body py-2">
                  <div className={`fw-bold fs-4 text-${s.colour}`}>{s.value}</div>
                  <div className="text-muted small">{s.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <ul className="nav nav-tabs mb-3" role="tablist">
        <li className="nav-item" role="presentation">
          <button className={`nav-link ${tab === 'history' ? 'active' : ''}`}
            onClick={() => setTab('history')} role="tab" aria-selected={tab === 'history'}>
            History
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button className={`nav-link ${tab === 'submit' ? 'active' : ''}`}
            onClick={() => setTab('submit')} role="tab" aria-selected={tab === 'submit'}>
            Submit Contribution
          </button>
        </li>
      </ul>

      {/* History tab */}
      {tab === 'history' && (
        <>
          {isLoading && <LoadingSpinner message="Loading your contributions…" />}
          {error && <ErrorMessage error={error} />}
          {!isLoading && !error && (
            <>
              {(!contributions || contributions.length === 0) ? (
                <div className="card border-0 shadow-sm">
                  <div className="card-body text-center py-5">
                    <i className="bi bi-cash-coin text-muted" style={{ fontSize: '2.5rem' }} aria-hidden="true" />
                    <p className="text-muted mt-2 mb-0">You haven't made any contributions yet.</p>
                    <button className="btn btn-ercms-primary mt-3" onClick={() => setTab('submit')}>
                      Submit your first contribution
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card border-0 shadow-sm">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Reference</th>
                          <th>Equb Group</th>
                          <th>Period</th>
                          <th>Amount (ETB)</th>
                          <th>Status</th>
                          <th>Submitted</th>
                          <th>Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contributions.map(c => (
                          <tr key={c.id}>
                            <td className="font-monospace small text-muted">{c.transaction_reference}</td>
                            <td className="fw-semibold">{c.equb_name}</td>
                            <td>{c.period_label}</td>
                            <td>{Number(c.amount).toLocaleString()}</td>
                            <td><StatusBadge status={c.status} /></td>
                            <td className="text-muted small">{new Date(c.created_at).toLocaleDateString()}</td>
                            <td className="text-muted small">{c.verification_note || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Submit tab */}
      {tab === 'submit' && (
        <SubmitContributionForm memberships={memberships} onSaved={refetch} />
      )}
    </div>
  );
}
