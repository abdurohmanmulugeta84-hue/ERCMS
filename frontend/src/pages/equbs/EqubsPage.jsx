/**
 * EqubsPage — for Organizers and Admins.
 *
 * Shows all Equb groups in a table. Organizers can create and manage their
 * own groups. Admins can see and edit all groups.
 *
 * Sub-views rendered in the same page via state:
 *   'list'   — table of all Equbs
 *   'create' — create new Equb form
 *   'detail' — view + edit a single Equb
 */
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import {
  listEqubs, createEqub, updateEqub, updateEqubStatus,
} from '../../api/equbsApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';

// ── Frequency and Status options ─────────────────────────────────────────────
const FREQUENCIES = [
  { value: 'weekly',   label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'monthly',  label: 'Monthly' },
];

const STATUS_OPTIONS = [
  { value: 'draft',     label: 'Draft' },
  { value: 'active',    label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const EMPTY_FORM = {
  name: '', description: '', contribution_amount: '',
  frequency: 'monthly', max_members: 0,
  allow_multiple_memberships: false,
  start_date: '', expected_end_date: '',
};

// ── Equb Form (create / edit) ─────────────────────────────────────────────────
function EqubForm({ initial = EMPTY_FORM, onSave, onCancel, saving, error, isEdit }) {
  const [form, setForm] = useState(initial);

  const set = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (!payload.start_date) delete payload.start_date;
    if (!payload.expected_end_date) delete payload.expected_end_date;
    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <ErrorMessage error={error} />

      <div className="row g-3">
        {/* Name */}
        <div className="col-12">
          <label htmlFor="eq_name" className="form-label fw-semibold">Group Name <span className="text-danger">*</span></label>
          <input id="eq_name" name="name" type="text" className="form-control"
            value={form.name} onChange={set} required disabled={saving} placeholder="e.g. Monthly Office Equb" />
        </div>

        {/* Description */}
        <div className="col-12">
          <label htmlFor="eq_desc" className="form-label fw-semibold">Description</label>
          <textarea id="eq_desc" name="description" className="form-control" rows={2}
            value={form.description} onChange={set} disabled={saving} placeholder="Optional details about this Equb group" />
        </div>

        {/* Contribution Amount */}
        <div className="col-md-4">
          <label htmlFor="eq_amount" className="form-label fw-semibold">Contribution Amount (ETB) <span className="text-danger">*</span></label>
          <input id="eq_amount" name="contribution_amount" type="number" min="1" step="0.01"
            className="form-control" value={form.contribution_amount} onChange={set}
            required disabled={saving} placeholder="500.00" />
        </div>

        {/* Frequency */}
        <div className="col-md-4">
          <label htmlFor="eq_freq" className="form-label fw-semibold">Frequency <span className="text-danger">*</span></label>
          <select id="eq_freq" name="frequency" className="form-select"
            value={form.frequency} onChange={set} disabled={saving}>
            {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>

        {/* Max Members */}
        <div className="col-md-4">
          <label htmlFor="eq_max" className="form-label fw-semibold">Max Members</label>
          <input id="eq_max" name="max_members" type="number" min="0"
            className="form-control" value={form.max_members} onChange={set}
            disabled={saving} />
          <div className="form-text">0 = no limit</div>
        </div>

        {/* Start Date */}
        <div className="col-md-4">
          <label htmlFor="eq_start" className="form-label fw-semibold">Start Date</label>
          <input id="eq_start" name="start_date" type="date" className="form-control"
            value={form.start_date} onChange={set} disabled={saving} />
        </div>

        {/* End Date */}
        <div className="col-md-4">
          <label htmlFor="eq_end" className="form-label fw-semibold">Expected End Date</label>
          <input id="eq_end" name="expected_end_date" type="date" className="form-control"
            value={form.expected_end_date} onChange={set} disabled={saving} />
        </div>

        {/* Allow Multiple Memberships */}
        <div className="col-md-4 d-flex align-items-end pb-1">
          <div className="form-check">
            <input id="eq_multi" name="allow_multiple_memberships" type="checkbox"
              className="form-check-input" checked={form.allow_multiple_memberships}
              onChange={set} disabled={saving} />
            <label htmlFor="eq_multi" className="form-check-label fw-semibold">
              Allow multiple memberships per user
            </label>
          </div>
        </div>
      </div>

      <div className="d-flex gap-2 mt-4">
        <button type="submit" className="btn btn-ercms-primary" disabled={saving}>
          {saving
            ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />{isEdit ? 'Saving…' : 'Creating…'}</>
            : isEdit ? 'Save Changes' : 'Create Equb'}
        </button>
        <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Status change badge row ───────────────────────────────────────────────────
function StatusControl({ equb, onStatusChange, canEdit }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [confirm, setConfirm] = useState(null); // { status, label }

  const handleChange = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateEqubStatus(equb.id, confirm.status);
      onStatusChange();
      setConfirm(null);
    } catch (err) {
      setError(err?.response?.data?.status?.[0] || 'Failed to update status.');
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) return <StatusBadge status={equb.status} />;

  const locked = equb.status === 'completed' || equb.status === 'cancelled';
  const next = STATUS_OPTIONS.filter(s => s.value !== equb.status && !locked);

  return (
    <div className="d-flex align-items-center gap-2 flex-wrap">
      <StatusBadge status={equb.status} />
      {!locked && (
        <div className="dropdown">
          <button className="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
            Change
          </button>
          <ul className="dropdown-menu">
            {next.map(s => (
              <li key={s.value}>
                <button className="dropdown-item" onClick={() => setConfirm(s)}>
                  Set to {s.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <span className="text-danger small">{error}</span>}
      <ConfirmDialog
        show={!!confirm}
        title="Change Equb Status"
        message={`Set this Equb to "${confirm?.label}"?`}
        confirmLabel="Confirm"
        confirmStyle="warning"
        isLoading={saving}
        onConfirm={handleChange}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

// ── Main page component ───────────────────────────────────────────────────────
export default function EqubsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState('list');   // 'list' | 'create' | 'detail'
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const { data: equbs, isLoading, error, refetch } = useFetch(listEqubs, []);

  const canEdit = (equb) =>
    user?.role === 'admin' || (user?.role === 'organizer' && equb.organizer === user?.id);

  // ── Create ────────────────────────────────────────────────────────────────
  const handleCreate = async (payload) => {
    setSaving(true);
    setFormError(null);
    try {
      await createEqub(payload);
      await refetch();
      setView('list');
    } catch (err) {
      setFormError(err?.response?.data || 'Failed to create Equb.');
    } finally {
      setSaving(false);
    }
  };

  // ── Update ────────────────────────────────────────────────────────────────
  const handleUpdate = async (payload) => {
    setSaving(true);
    setFormError(null);
    try {
      const updated = await updateEqub(selected.id, payload);
      await refetch();
      setSelected(updated);
      setView('detail');
    } catch (err) {
      setFormError(err?.response?.data || 'Failed to update Equb.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (view === 'create') {
    return (
      <div>
        <div className="ercms-page-header">
          <h1>Create New Equb Group</h1>
        </div>
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <EqubForm
              onSave={handleCreate}
              onCancel={() => setView('list')}
              saving={saving}
              error={formError}
              isEdit={false}
            />
          </div>
        </div>
      </div>
    );
  }

  if (view === 'detail' && selected) {
    const editable = canEdit(selected);
    return (
      <div>
        <div className="ercms-page-header d-flex justify-content-between align-items-start">
          <div>
            <button className="btn btn-link p-0 text-muted small mb-1" onClick={() => setView('list')}>
              <i className="bi bi-arrow-left me-1" />Back to list
            </button>
            <h1>{selected.name}</h1>
          </div>
          <div className="d-flex gap-2">
            {editable && (
              <button className="btn btn-outline-primary btn-sm"
                onClick={() => { setFormError(null); setView('edit'); }}>
                <i className="bi bi-pencil me-1" />Edit
              </button>
            )}
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => navigate(`/memberships?equb=${selected.id}`)}>
              <i className="bi bi-people me-1" />Members
            </button>
          </div>
        </div>

        <div className="row g-3">
          {/* Info card */}
          <div className="col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white fw-semibold">Group Details</div>
              <div className="card-body">
                <dl className="row mb-0">
                  {[
                    ['Status', <StatusControl equb={selected} onStatusChange={async () => { await refetch(); setView('list'); }} canEdit={editable} />],
                    ['Frequency', selected.frequency_display],
                    ['Contribution', `ETB ${Number(selected.contribution_amount).toLocaleString()}`],
                    ['Members', `${selected.member_count} / ${selected.max_members || '∞'}`],
                    ['Multiple memberships', selected.allow_multiple_memberships ? 'Allowed' : 'Not allowed'],
                    ['Start date', selected.start_date || '—'],
                    ['Expected end', selected.expected_end_date || '—'],
                    ['Organizer', selected.organizer_detail?.full_name || '—'],
                    ['Created', new Date(selected.created_at).toLocaleDateString()],
                  ].map(([label, value]) => (
                    <React.Fragment key={label}>
                      <dt className="col-5 text-muted small">{label}</dt>
                      <dd className="col-7 mb-2">{value}</dd>
                    </React.Fragment>
                  ))}
                </dl>
              </div>
            </div>
          </div>
          {/* Description card */}
          {selected.description && (
            <div className="col-md-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white fw-semibold">Description</div>
                <div className="card-body">
                  <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{selected.description}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'edit' && selected) {
    const initial = {
      name: selected.name,
      description: selected.description || '',
      contribution_amount: selected.contribution_amount,
      frequency: selected.frequency,
      max_members: selected.max_members,
      allow_multiple_memberships: selected.allow_multiple_memberships,
      start_date: selected.start_date || '',
      expected_end_date: selected.expected_end_date || '',
    };
    return (
      <div>
        <div className="ercms-page-header">
          <button className="btn btn-link p-0 text-muted small mb-1" onClick={() => setView('detail')}>
            <i className="bi bi-arrow-left me-1" />Back to details
          </button>
          <h1>Edit: {selected.name}</h1>
        </div>
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <EqubForm
              initial={initial}
              onSave={handleUpdate}
              onCancel={() => setView('detail')}
              saving={saving}
              error={formError}
              isEdit
            />
          </div>
        </div>
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  const canCreate = user?.role === 'admin' || user?.role === 'organizer';

  return (
    <div>
      <div className="ercms-page-header d-flex justify-content-between align-items-center">
        <div>
          <h1>Equb Groups</h1>
          <p className="text-muted mb-0">All registered Equb savings groups.</p>
        </div>
        {canCreate && (
          <button className="btn btn-ercms-primary" onClick={() => { setFormError(null); setView('create'); }}>
            <i className="bi bi-plus-circle me-2" aria-hidden="true" />New Equb
          </button>
        )}
      </div>

      {isLoading && <LoadingSpinner message="Loading Equb groups…" />}
      {error && <ErrorMessage error={error} />}

      {!isLoading && !error && (
        <>
          {equbs?.length === 0 ? (
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center py-5">
                <i className="bi bi-collection text-muted" style={{ fontSize: '2.5rem' }} aria-hidden="true" />
                <p className="text-muted mt-2 mb-0">No Equb groups yet.</p>
                {canCreate && (
                  <button className="btn btn-ercms-primary mt-3" onClick={() => setView('create')}>
                    Create the first Equb
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="card border-0 shadow-sm">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Frequency</th>
                      <th>Contribution (ETB)</th>
                      <th>Members</th>
                      <th>Organizer</th>
                      <th>Start Date</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {equbs.map(eq => (
                      <tr key={eq.id}>
                        <td className="fw-semibold">{eq.name}</td>
                        <td><StatusBadge status={eq.status} /></td>
                        <td>{eq.frequency_display}</td>
                        <td>{Number(eq.contribution_amount).toLocaleString()}</td>
                        <td>{eq.member_count} / {eq.max_members || '∞'}</td>
                        <td>{eq.organizer_name}</td>
                        <td>{eq.start_date || '—'}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={async () => {
                              const { getEqub } = await import('../../api/equbsApi');
                              const detail = await getEqub(eq.id);
                              setSelected(detail);
                              setView('detail');
                            }}
                          >
                            View
                          </button>
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
    </div>
  );
}
