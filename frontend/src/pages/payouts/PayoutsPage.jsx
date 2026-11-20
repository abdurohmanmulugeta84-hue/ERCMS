/**
 * PayoutsPage — Treasurer / Admin view.
 *
 * Two tabs:
 *   History — all payouts with filter by status / equb
 *   Process — form to process a payout for a rotation entry
 */
import React, { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { listPayouts, processPayout, cancelPayout } from '../../api/payoutsApi';
import { listSchedules, getSchedule } from '../../api/rotationsApi';
import { listEqubs } from '../../api/equbsApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const PAYOUT_METHODS = [
  { value: 'cash',          label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mpesa',         label: 'M-Pesa' },
  { value: 'chapa',         label: 'Chapa' },
  { value: 'other',         label: 'Other' },
];

// ── Process Payout form ───────────────────────────────────────────────────────
function ProcessPayoutForm({ equbs, onSaved }) {
  const [equbId, setEqubId]       = useState('');
  const [schedules, setSchedules] = useState([]);
  const [schedId, setSchedId]     = useState('');
  const [entries, setEntries]     = useState([]);
  const [loadingSched, setLoadingSched] = useState(false);
  const [form, setForm] = useState({
    rotation_entry: '', amount: '', method: 'cash',
    gateway_reference: '', notes: '',
  });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);
  const [success, setSuccess] = useState(null);

  const set = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleEqubChange = async (id) => {
    setEqubId(id);
    setSchedId('');
    setEntries([]);
    setForm(p => ({ ...p, rotation_entry: '', amount: '' }));
    if (!id) { setSchedules([]); return; }
    setLoadingSched(true);
    try {
      const data = await listSchedules({ equb: id });
      setSchedules(data.filter(s => s.status === 'active'));
    } catch { setSchedules([]); }
    finally { setLoadingSched(false); }
  };

  const handleSchedChange = async (id) => {
    setSchedId(id);
    setForm(p => ({ ...p, rotation_entry: '', amount: '' }));
    if (!id) { setEntries([]); return; }
    const detail = await getSchedule(Number(id));
    const eligible = (detail.entries || []).filter(
      e => e.status !== 'completed' && e.status !== 'skipped' && !e.has_payout
    );
    setEntries(eligible);
    // Prefill amount from equb
    const equb = equbs?.find(e => String(e.id) === equbId);
    if (equb) setForm(p => ({ ...p, amount: equb.contribution_amount }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await processPayout({
        rotation_entry: Number(form.rotation_entry),
        amount: form.amount,
        method: form.method,
        ...(form.gateway_reference ? { gateway_reference: form.gateway_reference } : {}),
        ...(form.notes ? { notes: form.notes } : {}),
      });
      setSuccess(`Payout ${result.payout_reference} processed for ${result.recipient_name}.`);
      setForm({ rotation_entry: '', amount: '', method: 'cash', gateway_reference: '', notes: '' });
      // Refresh entries
      if (schedId) handleSchedChange(schedId);
      onSaved();
    } catch (err) {
      setError(err?.response?.data || 'Failed to process payout.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white fw-semibold">Process a Payout</div>
      <div className="card-body">
        {success && (
          <div className="alert alert-success d-flex align-items-center gap-2" role="status">
            <i className="bi bi-check-circle-fill" aria-hidden="true" />{success}
          </div>
        )}
        <ErrorMessage error={error} onDismiss={() => setError(null)} />
        <form onSubmit={handleSubmit} noValidate>
          <div className="row g-3">
            {/* Equb */}
            <div className="col-md-4">
              <label className="form-label fw-semibold">Equb Group <span className="text-danger">*</span></label>
              <select className="form-select" value={equbId}
                onChange={e => handleEqubChange(e.target.value)} disabled={saving}>
                <option value="">— Select Equb —</option>
                {(equbs || []).filter(e => e.status === 'active').map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            {/* Schedule */}
            <div className="col-md-4">
              <label className="form-label fw-semibold">Rotation Schedule <span className="text-danger">*</span></label>
              <select className="form-select" value={schedId}
                onChange={e => handleSchedChange(e.target.value)} disabled={saving || !equbId}>
                <option value="">— Select Schedule —</option>
                {loadingSched
                  ? <option disabled>Loading…</option>
                  : schedules.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
              </select>
            </div>
            {/* Entry */}
            <div className="col-md-4">
              <label className="form-label fw-semibold">Rotation Position <span className="text-danger">*</span></label>
              <select name="rotation_entry" className="form-select" value={form.rotation_entry}
                onChange={set} disabled={saving || !schedId} required>
                <option value="">— Select position —</option>
                {entries.map(e => (
                  <option key={e.id} value={e.id}>
                    #{e.position} — {e.member_name}
                  </option>
                ))}
              </select>
            </div>
            {/* Amount */}
            <div className="col-md-3">
              <label className="form-label fw-semibold">Amount (ETB) <span className="text-danger">*</span></label>
              <input name="amount" type="number" min="1" step="0.01"
                className="form-control" value={form.amount}
                onChange={set} disabled={saving} required />
            </div>
            {/* Method */}
            <div className="col-md-3">
              <label className="form-label fw-semibold">Payment Method</label>
              <select name="method" className="form-select" value={form.method}
                onChange={set} disabled={saving}>
                {PAYOUT_METHODS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            {/* Gateway ref */}
            {['mpesa', 'chapa', 'bank_transfer'].includes(form.method) && (
              <div className="col-md-6">
                <label className="form-label fw-semibold">Transaction Reference</label>
                <input name="gateway_reference" type="text" className="form-control"
                  value={form.gateway_reference} onChange={set} disabled={saving}
                  placeholder="Provider transaction ID" />
              </div>
            )}
            {/* Notes */}
            <div className="col-12">
              <label className="form-label fw-semibold">Notes</label>
              <input name="notes" type="text" className="form-control"
                value={form.notes} onChange={set} disabled={saving} />
            </div>
          </div>
          <button type="submit" className="btn btn-ercms-primary mt-3"
            disabled={saving || !form.rotation_entry || !form.amount}>
            {saving
              ? <><span className="spinner-border spinner-border-sm me-2" />Processing…</>
              : 'Process Payout'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PayoutsPage() {
  const [tab, setTab]               = useState('history');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling]     = useState(false);
  const [cancelError, setCancelError]   = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: payouts, isLoading, error, refetch } = useFetch(listPayouts, []);
  const { data: equbs } = useFetch(listEqubs, []);

  const displayed = (payouts || []).filter(
    p => statusFilter === 'all' || p.status === statusFilter
  );

  const handleCancel = async () => {
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelPayout(cancelTarget.id, {});
      await refetch();
      setCancelTarget(null);
    } catch (err) {
      setCancelError(err?.response?.data?.non_field_errors?.[0] || 'Failed to cancel payout.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div>
      <div className="ercms-page-header">
        <h1>Payouts</h1>
        <p className="text-muted mb-0">Process and track Equb payout distributions.</p>
      </div>

      <ul className="nav nav-tabs mb-3" role="tablist">
        {[
          { key: 'history', label: 'Payout History' },
          { key: 'process', label: 'Process New Payout' },
        ].map(t => (
          <li className="nav-item" key={t.key} role="presentation">
            <button className={`nav-link ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)} role="tab">
              {t.label}
            </button>
          </li>
        ))}
      </ul>

      {tab === 'history' && (
        <>
          {cancelError && <ErrorMessage error={cancelError} onDismiss={() => setCancelError(null)} />}
          <div className="mb-3 d-flex gap-2 align-items-center flex-wrap">
            <span className="fw-semibold small text-muted me-1">Filter:</span>
            {['all', 'scheduled', 'processed', 'cancelled'].map(s => (
              <button key={s}
                className={`btn btn-sm ${statusFilter === s ? 'btn-dark' : 'btn-outline-secondary'}`}
                onClick={() => setStatusFilter(s)}>
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          {isLoading && <LoadingSpinner message="Loading payouts…" />}
          {error && <ErrorMessage error={error} />}
          {!isLoading && !error && (
            displayed.length === 0 ? (
              <div className="card border-0 shadow-sm">
                <div className="card-body text-center py-5">
                  <i className="bi bi-wallet2 text-muted" style={{ fontSize: '2.5rem' }} aria-hidden="true" />
                  <p className="text-muted mt-2 mb-0">No payouts found.</p>
                </div>
              </div>
            ) : (
              <div className="card border-0 shadow-sm">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Reference</th>
                        <th>Equb</th>
                        <th>Recipient</th>
                        <th>Position</th>
                        <th>Amount (ETB)</th>
                        <th>Method</th>
                        <th>Status</th>
                        <th>Processed</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayed.map(p => (
                        <tr key={p.id}>
                          <td className="font-monospace small">{p.payout_reference}</td>
                          <td>{p.equb_name}</td>
                          <td className="fw-semibold">{p.recipient_name}</td>
                          <td>#{p.position}</td>
                          <td>{Number(p.amount).toLocaleString()}</td>
                          <td className="text-muted small">{p.method_display}</td>
                          <td><StatusBadge status={p.status} /></td>
                          <td className="text-muted small">
                            {p.processed_at ? new Date(p.processed_at).toLocaleDateString() : '—'}
                          </td>
                          <td>
                            {p.status === 'scheduled' && (
                              <button className="btn btn-sm btn-outline-warning"
                                onClick={() => setCancelTarget(p)}>
                                Cancel
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
        </>
      )}

      {tab === 'process' && <ProcessPayoutForm equbs={equbs} onSaved={refetch} />}

      <ConfirmDialog
        show={!!cancelTarget}
        title="Cancel Payout"
        message={`Cancel payout ${cancelTarget?.payout_reference} for ${cancelTarget?.recipient_name}?`}
        confirmLabel="Cancel Payout"
        confirmStyle="warning"
        isLoading={cancelling}
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
