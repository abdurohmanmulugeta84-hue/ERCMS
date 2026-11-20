/**
 * RotationsPage — Organizer / Admin view.
 *
 * Three sub-views via state:
 *   list   — all schedules (for organizer's own equbs)
 *   create — create a new schedule
 *   detail — view a schedule, manage entries (add / remove / update position)
 */
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import {
  listSchedules, getSchedule, createSchedule, updateSchedule,
  addEntry, updateEntry, deleteEntry,
} from '../../api/rotationsApi';
import { listEqubs } from '../../api/equbsApi';
import { listMemberships } from '../../api/membershipsApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const SCHEDULE_STATUSES = [
  { value: 'draft',     label: 'Draft' },
  { value: 'active',    label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

// ── Add / Edit Entry modal ────────────────────────────────────────────────────
function EntryModal({ scheduleId, equbId, existing, onDone, onClose }) {
  const isEdit = !!existing;
  const [memberships, setMemberships] = useState(null);
  const [form, setForm] = useState({
    membership: existing?.membership ?? '',
    position: existing?.position ?? '',
    expected_payout_date: existing?.expected_payout_date ?? '',
    notes: existing?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  // Load memberships for this equb on mount
  React.useEffect(() => {
    listMemberships({ equb: equbId }).then(data =>
      setMemberships(data.filter(m => m.status === 'approved'))
    ).catch(() => setMemberships([]));
  }, [equbId]);

  const set = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      membership: Number(form.membership),
      position: Number(form.position),
      ...(form.expected_payout_date ? { expected_payout_date: form.expected_payout_date } : {}),
      ...(form.notes ? { notes: form.notes } : {}),
    };
    try {
      if (isEdit) {
        await updateEntry(scheduleId, existing.id, payload);
      } else {
        await addEntry(scheduleId, payload);
      }
      onDone();
    } catch (err) {
      setError(err?.response?.data || 'Failed to save entry.');
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
              <h5 className="modal-title">{isEdit ? 'Edit Entry' : 'Assign Position'}</h5>
              <button type="button" className="btn-close" onClick={onClose} disabled={saving} aria-label="Close" />
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <ErrorMessage error={error} onDismiss={() => setError(null)} />
                <div className="row g-3">
                  <div className="col-8">
                    <label htmlFor="ent_member" className="form-label fw-semibold">Member <span className="text-danger">*</span></label>
                    <select id="ent_member" name="membership" className="form-select"
                      value={form.membership} onChange={set} disabled={saving || isEdit} required>
                      <option value="">— Select member —</option>
                      {memberships === null
                        ? <option disabled>Loading…</option>
                        : memberships.map(m => (
                          <option key={m.id} value={m.id}>{m.user_full_name}</option>
                        ))}
                    </select>
                  </div>
                  <div className="col-4">
                    <label htmlFor="ent_pos" className="form-label fw-semibold">Position <span className="text-danger">*</span></label>
                    <input id="ent_pos" name="position" type="number" min="1"
                      className="form-control" value={form.position}
                      onChange={set} disabled={saving} required />
                  </div>
                  <div className="col-6">
                    <label htmlFor="ent_date" className="form-label fw-semibold">Expected Payout Date</label>
                    <input id="ent_date" name="expected_payout_date" type="date"
                      className="form-control" value={form.expected_payout_date}
                      onChange={set} disabled={saving} />
                  </div>
                  <div className="col-12">
                    <label htmlFor="ent_notes" className="form-label fw-semibold">Notes</label>
                    <input id="ent_notes" name="notes" type="text" className="form-control"
                      value={form.notes} onChange={set} disabled={saving} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-ercms-primary" disabled={saving || !form.membership || !form.position}>
                  {saving
                    ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />{isEdit ? 'Saving…' : 'Assign…'}</>
                    : isEdit ? 'Save Changes' : 'Assign Position'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Schedule Detail ───────────────────────────────────────────────────────────
function ScheduleDetail({ schedule, onBack, onRefreshList }) {
  const { user } = useAuth();
  const [detail, setDetail]     = useState(schedule);
  const [loading, setLoading]   = useState(false);
  const [showAdd, setShowAdd]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [statusSaving, setStatusSaving] = useState(false);

  const canEdit = user?.role === 'admin' ||
    (user?.role === 'organizer' && detail.created_by === user?.id);

  const refresh = async () => {
    setLoading(true);
    try { setDetail(await getSchedule(detail.id)); } finally { setLoading(false); }
  };

  const handleStatusChange = async (newStatus) => {
    setStatusSaving(true);
    setActionError(null);
    try {
      const updated = await updateSchedule(detail.id, { status: newStatus });
      setDetail(updated);
      onRefreshList();
    } catch (err) {
      setActionError(err?.response?.data?.status?.[0] || 'Failed to update status.');
    } finally {
      setStatusSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteEntry(detail.id, deleteTarget.id);
      setDeleteTarget(null);
      await refresh();
    } catch (err) {
      setActionError(err?.response?.data?.detail || 'Failed to remove entry.');
    } finally {
      setDeleting(false);
    }
  };

  const locked = detail.status === 'completed' || detail.status === 'cancelled';
  const nextStatuses = SCHEDULE_STATUSES.filter(s => s.value !== detail.status && !locked);

  return (
    <div>
      <div className="ercms-page-header">
        <button className="btn btn-link p-0 text-muted small mb-1" onClick={onBack}>
          <i className="bi bi-arrow-left me-1" />Back to schedules
        </button>
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <h1>{detail.title}</h1>
            <p className="text-muted mb-0">{detail.equb_name}</p>
          </div>
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <StatusBadge status={detail.status} />
            {canEdit && !locked && (
              <div className="dropdown">
                <button className="btn btn-sm btn-outline-secondary dropdown-toggle"
                  data-bs-toggle="dropdown" disabled={statusSaving}>
                  {statusSaving ? <span className="spinner-border spinner-border-sm" /> : 'Change Status'}
                </button>
                <ul className="dropdown-menu">
                  {nextStatuses.map(s => (
                    <li key={s.value}>
                      <button className="dropdown-item" onClick={() => handleStatusChange(s.value)}>
                        Set to {s.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {canEdit && detail.status !== 'cancelled' && (
              <button className="btn btn-sm btn-ercms-primary" onClick={() => setShowAdd(true)}>
                <i className="bi bi-plus-circle me-1" />Add Member
              </button>
            )}
          </div>
        </div>
      </div>

      {actionError && <ErrorMessage error={actionError} onDismiss={() => setActionError(null)} />}

      <div className="row g-3 mb-4">
        {[
          ['Total positions', detail.entries?.length ?? 0],
          ['Completed', detail.entries?.filter(e => e.status === 'completed').length ?? 0],
          ['Pending', detail.entries?.filter(e => e.status === 'pending').length ?? 0],
        ].map(([label, val]) => (
          <div className="col-6 col-md-3" key={label}>
            <div className="card border-0 shadow-sm">
              <div className="card-body py-2">
                <div className="fw-bold fs-4">{val}</div>
                <div className="text-muted small">{label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading && <LoadingSpinner />}
      {!loading && (
        <div className="card border-0 shadow-sm">
          {!detail.entries || detail.entries.length === 0 ? (
            <div className="card-body text-center py-5">
              <i className="bi bi-arrow-repeat text-muted" style={{ fontSize: '2.5rem' }} aria-hidden="true" />
              <p className="text-muted mt-2 mb-0">No members assigned yet.</p>
              {canEdit && (
                <button className="btn btn-ercms-primary mt-3" onClick={() => setShowAdd(true)}>
                  Assign first position
                </button>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Member</th>
                    <th>Status</th>
                    <th>Expected Payout</th>
                    <th>Payout Processed</th>
                    <th>Notes</th>
                    {canEdit && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {[...detail.entries].sort((a, b) => a.position - b.position).map(entry => (
                    <tr key={entry.id} className={entry.status === 'completed' ? 'table-success' : ''}>
                      <td className="fw-bold">{entry.position}</td>
                      <td>{entry.member_name}</td>
                      <td><StatusBadge status={entry.status} /></td>
                      <td className="text-muted small">{entry.expected_payout_date || '—'}</td>
                      <td>
                        {entry.has_payout
                          ? <span className="badge bg-success">Yes</span>
                          : <span className="badge bg-secondary">No</span>}
                      </td>
                      <td className="text-muted small">{entry.notes || '—'}</td>
                      {canEdit && (
                        <td>
                          <div className="d-flex gap-1">
                            {entry.status !== 'completed' && (
                              <>
                                <button className="btn btn-sm btn-outline-primary"
                                  onClick={() => setEditTarget(entry)}
                                  title="Edit" aria-label="Edit entry">
                                  <i className="bi bi-pencil" aria-hidden="true" />
                                </button>
                                {!entry.has_payout && (
                                  <button className="btn btn-sm btn-outline-danger"
                                    onClick={() => setDeleteTarget(entry)}
                                    title="Remove" aria-label="Remove entry">
                                    <i className="bi bi-trash" aria-hidden="true" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <EntryModal
          scheduleId={detail.id}
          equbId={detail.equb}
          onDone={async () => { setShowAdd(false); await refresh(); }}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editTarget && (
        <EntryModal
          scheduleId={detail.id}
          equbId={detail.equb}
          existing={editTarget}
          onDone={async () => { setEditTarget(null); await refresh(); }}
          onClose={() => setEditTarget(null)}
        />
      )}
      <ConfirmDialog
        show={!!deleteTarget}
        title="Remove Entry"
        message={`Remove position ${deleteTarget?.position} (${deleteTarget?.member_name}) from this schedule?`}
        confirmLabel="Remove"
        confirmStyle="danger"
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ── Create Schedule form ──────────────────────────────────────────────────────
function CreateScheduleForm({ equbs, onSaved, onCancel }) {
  const [form, setForm]   = useState({ equb: '', title: '', status: 'draft', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);
  const set = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createSchedule({ ...form, equb: Number(form.equb) });
      onSaved();
    } catch (err) {
      setError(err?.response?.data || 'Failed to create schedule.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="ercms-page-header">
        <button className="btn btn-link p-0 text-muted small mb-1" onClick={onCancel}>
          <i className="bi bi-arrow-left me-1" />Back to schedules
        </button>
        <h1>Create Rotation Schedule</h1>
      </div>
      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <ErrorMessage error={error} onDismiss={() => setError(null)} />
          <form onSubmit={handleSubmit} noValidate>
            <div className="row g-3">
              <div className="col-md-6">
                <label htmlFor="cs_equb" className="form-label fw-semibold">Equb Group <span className="text-danger">*</span></label>
                <select id="cs_equb" name="equb" className="form-select"
                  value={form.equb} onChange={set} disabled={saving} required>
                  <option value="">— Select Equb —</option>
                  {(equbs || []).filter(e => e.status === 'active').map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label htmlFor="cs_title" className="form-label fw-semibold">Title <span className="text-danger">*</span></label>
                <input id="cs_title" name="title" type="text" className="form-control"
                  value={form.title} onChange={set} disabled={saving}
                  placeholder="e.g. Office Equb 2026 Rotation" required />
              </div>
              <div className="col-md-4">
                <label htmlFor="cs_status" className="form-label fw-semibold">Initial Status</label>
                <select id="cs_status" name="status" className="form-select"
                  value={form.status} onChange={set} disabled={saving}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                </select>
              </div>
              <div className="col-12">
                <label htmlFor="cs_notes" className="form-label fw-semibold">Notes</label>
                <textarea id="cs_notes" name="notes" className="form-control" rows={2}
                  value={form.notes} onChange={set} disabled={saving} />
              </div>
            </div>
            <div className="d-flex gap-2 mt-4">
              <button type="submit" className="btn btn-ercms-primary"
                disabled={saving || !form.equb || !form.title}>
                {saving ? <><span className="spinner-border spinner-border-sm me-2" />Creating…</> : 'Create Schedule'}
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RotationsPage() {
  const { user } = useAuth();
  const [view, setView]       = useState('list');
  const [selected, setSelected] = useState(null);

  const { data: schedules, isLoading, error, refetch } = useFetch(listSchedules, []);
  const { data: equbs } = useFetch(listEqubs, []);

  if (view === 'create') {
    return <CreateScheduleForm equbs={equbs} onSaved={() => { refetch(); setView('list'); }} onCancel={() => setView('list')} />;
  }

  if (view === 'detail' && selected) {
    return <ScheduleDetail schedule={selected} onBack={() => setView('list')} onRefreshList={refetch} />;
  }

  const canCreate = user?.role === 'admin' || user?.role === 'organizer';

  return (
    <div>
      <div className="ercms-page-header d-flex justify-content-between align-items-center">
        <div>
          <h1>Rotation Schedules</h1>
          <p className="text-muted mb-0">Manage payout rotation order for your Equb groups.</p>
        </div>
        {canCreate && (
          <button className="btn btn-ercms-primary" onClick={() => setView('create')}>
            <i className="bi bi-plus-circle me-2" />New Schedule
          </button>
        )}
      </div>

      {isLoading && <LoadingSpinner message="Loading schedules…" />}
      {error && <ErrorMessage error={error} />}

      {!isLoading && !error && (
        schedules?.length === 0 ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5">
              <i className="bi bi-arrow-repeat text-muted" style={{ fontSize: '2.5rem' }} aria-hidden="true" />
              <p className="text-muted mt-2 mb-0">No rotation schedules yet.</p>
              {canCreate && (
                <button className="btn btn-ercms-primary mt-3" onClick={() => setView('create')}>
                  Create first schedule
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="row g-3">
            {(schedules || []).map(s => (
              <div className="col-12 col-md-6 col-lg-4" key={s.id}>
                <div className="card border-0 shadow-sm h-100 ercms-stat-card">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h6 className="fw-bold mb-0">{s.title}</h6>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="text-muted small mb-2">{s.equb_name}</p>
                    <div className="d-flex gap-3 mb-3 small text-muted">
                      <span><i className="bi bi-people me-1" />{s.total_entries} members</span>
                      <span><i className="bi bi-check-circle me-1" />{s.completed_entries} done</span>
                    </div>
                    <button className="btn btn-sm btn-outline-primary w-100"
                      onClick={async () => {
                        const detail = await getSchedule(s.id);
                        setSelected(detail);
                        setView('detail');
                      }}>
                      View / Manage
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
