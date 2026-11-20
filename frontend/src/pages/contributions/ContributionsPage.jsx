/**
 * ContributionsPage — Treasurer and Admin view.
 *
 * Four tabs:
 *   All          — full list with status filter
 *   Pending      — submitted, awaiting verification
 *   Outstanding  — members who haven't contributed for a period
 *   Record       — form to record a new contribution on behalf of a member
 *
 * Verify / reject inline on the Pending tab.
 * Record Payment modal available from All / Pending tabs.
 */
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import {
  listContributions, verifyContribution,
  recordPayment, getOutstanding,
  submitContribution,
} from '../../api/contributionsApi';
import { listEqubs } from '../../api/equbsApi';
import { listMemberships } from '../../api/membershipsApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const PAYMENT_METHODS = [
  { value: 'cash',          label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mpesa',         label: 'M-Pesa' },
  { value: 'chapa',         label: 'Chapa' },
  { value: 'other',         label: 'Other' },
];

// ── Verify / Reject modal ─────────────────────────────────────────────────────
function VerifyModal({ contribution, onDone, onClose }) {
  const [action, setAction]   = useState('verify');
  const [note, setNote]       = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await verifyContribution(contribution.id, { action, verification_note: note });
      onDone();
    } catch (err) {
      setError(err?.response?.data || 'Failed to process verification.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show" onClick={!saving ? onClose : undefined} aria-hidden="true" />
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="verifyModalTitle">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="verifyModalTitle">Verify Contribution</h5>
              <button type="button" className="btn-close" onClick={onClose} disabled={saving} aria-label="Close" />
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="mb-3 p-3 bg-light rounded small">
                  <div><strong>Member:</strong> {contribution.member_name}</div>
                  <div><strong>Equb:</strong> {contribution.equb_name}</div>
                  <div><strong>Period:</strong> {contribution.period_label}</div>
                  <div><strong>Amount:</strong> ETB {Number(contribution.amount).toLocaleString()}</div>
                  <div><strong>Reference:</strong> {contribution.transaction_reference}</div>
                </div>
                <ErrorMessage error={error} onDismiss={() => setError(null)} />
                <div className="mb-3">
                  <label className="form-label fw-semibold">Decision</label>
                  <div className="d-flex gap-4">
                    {['verify', 'reject'].map(a => (
                      <div className="form-check" key={a}>
                        <input type="radio" className="form-check-input" name="v_action"
                          id={`v_${a}`} value={a} checked={action === a}
                          onChange={() => setAction(a)} disabled={saving} />
                        <label className="form-check-label text-capitalize" htmlFor={`v_${a}`}>{a}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="v_note" className="form-label fw-semibold">
                    Note <span className="text-muted fw-normal">(optional)</span>
                  </label>
                  <textarea id="v_note" className="form-control" rows={2}
                    value={note} onChange={e => setNote(e.target.value)}
                    disabled={saving} placeholder="Reason or reference…" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
                <button type="submit"
                  className={`btn btn-${action === 'verify' ? 'success' : 'danger'}`}
                  disabled={saving}>
                  {saving
                    ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Processing…</>
                    : action === 'verify' ? 'Verify' : 'Reject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Record Payment modal ──────────────────────────────────────────────────────
function PaymentModal({ contribution, onDone, onClose }) {
  const [form, setForm]   = useState({ amount: contribution.amount, method: 'cash', gateway_reference: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  const set = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await recordPayment({ contribution: contribution.id, ...form });
      onDone();
    } catch (err) {
      setError(err?.response?.data || 'Failed to record payment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show" onClick={!saving ? onClose : undefined} aria-hidden="true" />
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="payModalTitle">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="payModalTitle">Record Payment</h5>
              <button type="button" className="btn-close" onClick={onClose} disabled={saving} aria-label="Close" />
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <p className="small text-muted mb-3">
                  Recording payment for <strong>{contribution.member_name}</strong> —
                  {contribution.period_label}
                </p>
                <ErrorMessage error={error} onDismiss={() => setError(null)} />
                <div className="row g-3">
                  <div className="col-6">
                    <label htmlFor="pay_amount" className="form-label fw-semibold">Amount (ETB)</label>
                    <input id="pay_amount" name="amount" type="number" min="1" step="0.01"
                      className="form-control" value={form.amount} onChange={set}
                      required disabled={saving} />
                  </div>
                  <div className="col-6">
                    <label htmlFor="pay_method" className="form-label fw-semibold">Method</label>
                    <select id="pay_method" name="method" className="form-select"
                      value={form.method} onChange={set} disabled={saving}>
                      {PAYMENT_METHODS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  {['mpesa', 'chapa', 'bank_transfer'].includes(form.method) && (
                    <div className="col-12">
                      <label htmlFor="pay_ref" className="form-label fw-semibold">
                        Gateway / Bank Reference
                      </label>
                      <input id="pay_ref" name="gateway_reference" type="text"
                        className="form-control" value={form.gateway_reference}
                        onChange={set} disabled={saving} placeholder="Transaction ID from provider" />
                    </div>
                  )}
                  <div className="col-12">
                    <label htmlFor="pay_notes" className="form-label fw-semibold">
                      Notes <span className="text-muted fw-normal">(optional)</span>
                    </label>
                    <textarea id="pay_notes" name="notes" className="form-control" rows={2}
                      value={form.notes} onChange={set} disabled={saving} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-ercms-primary" disabled={saving}>
                  {saving
                    ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Saving…</>
                    : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Record Contribution form (on behalf of a member) ─────────────────────────
function RecordContributionForm({ equbs, onSaved }) {
  const [selectedEqubId, setSelectedEqubId] = useState('');
  const [memberships, setMemberships]       = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [form, setForm] = useState({ membership: '', amount: '', period_label: '', notes: '' });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);
  const [success, setSuccess] = useState(null);

  const set = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleEqubChange = async (e) => {
    const id = e.target.value;
    setSelectedEqubId(id);
    setForm(p => ({ ...p, membership: '', amount: '' }));
    if (!id) { setMemberships([]); return; }

    // Prefill amount from selected equb
    const equb = equbs.find(eq => String(eq.id) === String(id));
    if (equb) setForm(p => ({ ...p, amount: equb.contribution_amount }));

    setLoadingMembers(true);
    try {
      const data = await listMemberships({ equb: id });
      setMemberships(data.filter(m => m.status === 'approved'));
    } catch { setMemberships([]); }
    finally { setLoadingMembers(false); }
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
      setSuccess(`Contribution ${result.transaction_reference} recorded.`);
      setForm({ membership: '', amount: equbs.find(eq => String(eq.id) === selectedEqubId)?.contribution_amount || '', period_label: '', notes: '' });
      onSaved();
    } catch (err) {
      setError(err?.response?.data || 'Failed to record contribution.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white fw-semibold">
        Record a Contribution on Behalf of a Member
      </div>
      <div className="card-body">
        {success && <div className="alert alert-success py-2">{success}</div>}
        <ErrorMessage error={error} onDismiss={() => setError(null)} />
        <form onSubmit={handleSubmit} noValidate>
          <div className="row g-3">
            <div className="col-md-4">
              <label htmlFor="rc_equb" className="form-label fw-semibold">Equb Group <span className="text-danger">*</span></label>
              <select id="rc_equb" className="form-select" value={selectedEqubId}
                onChange={handleEqubChange} disabled={saving}>
                <option value="">— Select Equb —</option>
                {(equbs || []).filter(e => e.status === 'active').map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label htmlFor="rc_member" className="form-label fw-semibold">Member <span className="text-danger">*</span></label>
              <select id="rc_member" name="membership" className="form-select"
                value={form.membership} onChange={set} disabled={saving || !selectedEqubId}>
                <option value="">— Select Member —</option>
                {loadingMembers
                  ? <option disabled>Loading…</option>
                  : memberships.map(m => (
                    <option key={m.id} value={m.id}>{m.user_full_name}</option>
                  ))}
              </select>
            </div>
            <div className="col-md-4">
              <label htmlFor="rc_period" className="form-label fw-semibold">Period <span className="text-danger">*</span></label>
              <input id="rc_period" name="period_label" type="text" className="form-control"
                value={form.period_label} onChange={set} disabled={saving}
                placeholder="e.g. 2026-10 or Week 42" required />
            </div>
            <div className="col-md-4">
              <label htmlFor="rc_amount" className="form-label fw-semibold">Amount (ETB) <span className="text-danger">*</span></label>
              <input id="rc_amount" name="amount" type="number" min="1" step="0.01"
                className="form-control" value={form.amount} onChange={set}
                disabled={saving} required />
            </div>
            <div className="col-md-8">
              <label htmlFor="rc_notes" className="form-label fw-semibold">Notes</label>
              <input id="rc_notes" name="notes" type="text" className="form-control"
                value={form.notes} onChange={set} disabled={saving}
                placeholder="Optional payment notes" />
            </div>
          </div>
          <button type="submit" className="btn btn-ercms-primary mt-3" disabled={saving || !form.membership || !form.period_label}>
            {saving
              ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Recording…</>
              : 'Record Contribution'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Contributions table ───────────────────────────────────────────────────────
function ContributionTable({ contributions, onVerify, onPay, showActions }) {
  if (!contributions || contributions.length === 0) {
    return (
      <div className="text-center py-5">
        <i className="bi bi-cash-coin text-muted" style={{ fontSize: '2.5rem' }} aria-hidden="true" />
        <p className="text-muted mt-2 mb-0">No contributions found.</p>
      </div>
    );
  }
  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th>Reference</th>
            <th>Member</th>
            <th>Equb</th>
            <th>Period</th>
            <th>Amount (ETB)</th>
            <th>Status</th>
            <th>Submitted</th>
            {showActions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {contributions.map(c => (
            <tr key={c.id}>
              <td className="font-monospace small">{c.transaction_reference}</td>
              <td className="fw-semibold">{c.member_name}</td>
              <td>{c.equb_name}</td>
              <td>{c.period_label}</td>
              <td>{Number(c.amount).toLocaleString()}</td>
              <td><StatusBadge status={c.status} /></td>
              <td className="text-muted small">{new Date(c.created_at).toLocaleDateString()}</td>
              {showActions && (
                <td>
                  <div className="d-flex gap-1 flex-wrap">
                    {c.status === 'submitted' && (
                      <button className="btn btn-sm btn-outline-success"
                        onClick={() => onVerify(c)}>
                        Verify
                      </button>
                    )}
                    {(c.status === 'submitted' || c.status === 'outstanding') && (
                      <button className="btn btn-sm btn-outline-primary"
                        onClick={() => onPay(c)}>
                        Payment
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Outstanding tab ───────────────────────────────────────────────────────────
function OutstandingTab({ equbs }) {
  const [equbId, setEqubId]   = useState('');
  const [period, setPeriod]   = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!equbId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getOutstanding({ equb: equbId, ...(period ? { period } : {}) });
      setResults(data);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to fetch outstanding contributions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSearch} className="row g-2 mb-3">
        <div className="col-md-4">
          <select className="form-select" value={equbId} onChange={e => setEqubId(e.target.value)}>
            <option value="">— Select Equb —</option>
            {(equbs || []).filter(e => e.status === 'active').map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
        <div className="col-md-4">
          <input type="text" className="form-control" value={period}
            onChange={e => setPeriod(e.target.value)} placeholder="Period (e.g. 2026-10) — optional" />
        </div>
        <div className="col-md-2">
          <button type="submit" className="btn btn-ercms-primary w-100" disabled={!equbId || loading}>
            {loading ? <span className="spinner-border spinner-border-sm" aria-hidden="true" /> : 'Search'}
          </button>
        </div>
      </form>
      <ErrorMessage error={error} />
      {results !== null && (
        results.length === 0 ? (
          <div className="alert alert-success">All members have contributed for this period.</div>
        ) : (
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white fw-semibold text-danger">
              {results.length} member{results.length !== 1 ? 's' : ''} outstanding
            </div>
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr><th>Member</th><th>Email</th></tr>
                </thead>
                <tbody>
                  {results.map(r => (
                    <tr key={r.user_id}>
                      <td className="fw-semibold">{r.member_name}</td>
                      <td className="text-muted small">{r.member_email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ContributionsPage() {
  const [tab, setTab]           = useState('all');
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [payTarget, setPayTarget]       = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: contributions, isLoading, error, refetch } = useFetch(listContributions, []);
  const { data: equbs } = useFetch(listEqubs, []);

  const displayed = (contributions || []).filter(
    c => statusFilter === 'all' || c.status === statusFilter
  );
  const pendingCount = (contributions || []).filter(c => c.status === 'submitted').length;

  const TABS = [
    { key: 'all',         label: 'All Contributions' },
    { key: 'pending',     label: 'Pending Verification', badge: pendingCount },
    { key: 'outstanding', label: 'Outstanding' },
    { key: 'record',      label: 'Record New' },
  ];

  return (
    <div>
      <div className="ercms-page-header">
        <h1>Contributions</h1>
        <p className="text-muted mb-0">Manage member contribution records and payments.</p>
      </div>

      {/* Tab navigation */}
      <ul className="nav nav-tabs mb-3" role="tablist">
        {TABS.map(t => (
          <li className="nav-item" key={t.key} role="presentation">
            <button
              className={`nav-link ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
              role="tab"
              aria-selected={tab === t.key}
            >
              {t.label}
              {t.badge > 0 && (
                <span className="badge bg-warning text-dark ms-1">{t.badge}</span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {/* All contributions tab */}
      {tab === 'all' && (
        <>
          <div className="mb-3 d-flex gap-2 align-items-center flex-wrap">
            <label className="fw-semibold small text-muted me-1">Filter:</label>
            {['all', 'submitted', 'verified', 'rejected', 'outstanding'].map(s => (
              <button
                key={s}
                className={`btn btn-sm ${statusFilter === s ? 'btn-dark' : 'btn-outline-secondary'}`}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          {isLoading && <LoadingSpinner message="Loading contributions…" />}
          {error && <ErrorMessage error={error} />}
          {!isLoading && !error && (
            <div className="card border-0 shadow-sm">
              <ContributionTable
                contributions={displayed}
                onVerify={setVerifyTarget}
                onPay={setPayTarget}
                showActions
              />
            </div>
          )}
        </>
      )}

      {/* Pending tab */}
      {tab === 'pending' && (
        <>
          {isLoading && <LoadingSpinner message="Loading pending contributions…" />}
          {!isLoading && (
            <div className="card border-0 shadow-sm">
              <ContributionTable
                contributions={(contributions || []).filter(c => c.status === 'submitted')}
                onVerify={setVerifyTarget}
                onPay={setPayTarget}
                showActions
              />
            </div>
          )}
        </>
      )}

      {/* Outstanding tab */}
      {tab === 'outstanding' && <OutstandingTab equbs={equbs} />}

      {/* Record new tab */}
      {tab === 'record' && (
        <RecordContributionForm equbs={equbs} onSaved={refetch} />
      )}

      {/* Verify modal */}
      {verifyTarget && (
        <VerifyModal
          contribution={verifyTarget}
          onDone={async () => { await refetch(); setVerifyTarget(null); }}
          onClose={() => setVerifyTarget(null)}
        />
      )}

      {/* Payment modal */}
      {payTarget && (
        <PaymentModal
          contribution={payTarget}
          onDone={async () => { await refetch(); setPayTarget(null); }}
          onClose={() => setPayTarget(null)}
        />
      )}
    </div>
  );
}
