/**
 * MeetingsPage — Organizer / Admin view.
 *
 * Views: list → create | detail (with attendance recorder)
 */
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import {
  listMeetings, getMeeting, createMeeting, updateMeeting,
  recordAttendance, updateAttendance, bulkAttendance,
} from '../../api/meetingsApi';
import { listEqubs } from '../../api/equbsApi';
import { listMemberships } from '../../api/membershipsApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import StatusBadge from '../../components/common/StatusBadge';

const ATTENDANCE_STATUSES = [
  { value: 'present', label: 'Present' },
  { value: 'absent',  label: 'Absent'  },
  { value: 'excused', label: 'Excused' },
];

// ── Attendance recorder panel ─────────────────────────────────────────────────
function AttendanceRecorder({ meeting, onSaved }) {
  const [memberships, setMemberships] = useState(null);
  const [records, setRecords]   = useState({});   // { membershipId: { status, notes } }
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState(false);

  React.useEffect(() => {
    listMemberships({ equb: meeting.equb }).then(data => {
      const approved = data.filter(m => m.status === 'approved');
      setMemberships(approved);
      // Pre-fill from existing attendance
      const init = {};
      (meeting.attendances || []).forEach(a => {
        init[a.membership] = { status: a.status, notes: a.notes, id: a.id };
      });
      approved.forEach(m => {
        if (!init[m.id]) init[m.id] = { status: 'absent', notes: '', id: null };
      });
      setRecords(init);
    }).catch(() => setMemberships([]));
  }, [meeting.equb, meeting.id]);

  const setField = (mid, field, value) =>
    setRecords(p => ({ ...p, [mid]: { ...p[mid], [field]: value } }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const payload = {
        records: Object.entries(records).map(([mid, rec]) => ({
          membership: Number(mid),
          status: rec.status,
          notes: rec.notes || '',
        })),
      };
      await bulkAttendance(meeting.id, payload);
      setSuccess(true);
      onSaved();
    } catch (err) {
      setError(err?.response?.data || 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  if (!memberships) return <LoadingSpinner message="Loading members…" />;
  if (memberships.length === 0)
    return <p className="text-muted">No approved members in this Equb.</p>;

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white fw-semibold">
        Record Attendance — {memberships.length} member{memberships.length !== 1 ? 's' : ''}
      </div>
      <div className="card-body">
        {success && <div className="alert alert-success py-2" role="status">Attendance saved.</div>}
        <ErrorMessage error={error} onDismiss={() => setError(null)} />
        <div className="table-responsive mb-3">
          <table className="table table-sm align-middle mb-0">
            <thead className="table-light">
              <tr><th>Member</th><th>Status</th><th>Notes</th></tr>
            </thead>
            <tbody>
              {memberships.map(m => (
                <tr key={m.id}>
                  <td className="fw-semibold">{m.user_full_name}</td>
                  <td style={{ width: 150 }}>
                    <select
                      className="form-select form-select-sm"
                      value={records[m.id]?.status || 'absent'}
                      onChange={e => setField(m.id, 'status', e.target.value)}
                      disabled={saving}
                      aria-label={`Attendance status for ${m.user_full_name}`}
                    >
                      {ATTENDANCE_STATUSES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input type="text" className="form-control form-control-sm"
                      value={records[m.id]?.notes || ''}
                      onChange={e => setField(m.id, 'notes', e.target.value)}
                      disabled={saving} placeholder="Optional note" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn btn-ercms-primary" onClick={handleSave} disabled={saving}>
          {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</> : 'Save Attendance'}
        </button>
      </div>
    </div>
  );
}

// ── Meeting detail view ───────────────────────────────────────────────────────
function MeetingDetail({ meeting: initialMeeting, onBack }) {
  const { user } = useAuth();
  const [meeting, setMeeting]   = useState(initialMeeting);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError]   = useState(null);
  const [tab, setTab]           = useState('info');

  const canEdit = user?.role === 'admin' ||
    (user?.role === 'organizer' && meeting.created_by === user?.id);

  const locked = meeting.status === 'completed' || meeting.status === 'cancelled';

  const handleStatusChange = async (newStatus) => {
    setStatusSaving(true);
    setStatusError(null);
    try {
      const updated = await updateMeeting(meeting.id, { status: newStatus });
      setMeeting(updated);
    } catch (err) {
      setStatusError(err?.response?.data?.status?.[0] || 'Failed to update status.');
    } finally {
      setStatusSaving(false);
    }
  };

  const refreshMeeting = async () => {
    const updated = await getMeeting(meeting.id);
    setMeeting(updated);
  };

  const presentCount = (meeting.attendances || []).filter(a => a.status === 'present').length;
  const absentCount  = (meeting.attendances || []).filter(a => a.status === 'absent').length;

  return (
    <div>
      <div className="ercms-page-header">
        <button className="btn btn-link p-0 text-muted small mb-1" onClick={onBack}>
          <i className="bi bi-arrow-left me-1" />Back
        </button>
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <h1>{meeting.title}</h1>
            <p className="text-muted mb-0">{meeting.equb_name}</p>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <StatusBadge status={meeting.status} />
            {canEdit && !locked && (
              <div className="dropdown">
                <button className="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown" disabled={statusSaving}>
                  Change Status
                </button>
                <ul className="dropdown-menu">
                  {['upcoming', 'completed', 'cancelled'].filter(s => s !== meeting.status).map(s => (
                    <li key={s}><button className="dropdown-item text-capitalize" onClick={() => handleStatusChange(s)}>{s}</button></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {statusError && <ErrorMessage error={statusError} onDismiss={() => setStatusError(null)} />}

      <ul className="nav nav-tabs mb-3">
        {[{ key: 'info', label: 'Details' }, { key: 'attendance', label: `Attendance (${presentCount} present)` }].map(t => (
          <li className="nav-item" key={t.key}>
            <button className={`nav-link ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
          </li>
        ))}
      </ul>

      {tab === 'info' && (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <dl className="row mb-0">
              {[
                ['Date & Time', new Date(meeting.meeting_date).toLocaleString()],
                ['Location',   meeting.location || '—'],
                ['Status',     meeting.status_display],
                ['Organised by', meeting.created_by_name],
                ['Present',    `${presentCount} / ${meeting.attendance_count}`],
                ['Absent',     absentCount],
              ].map(([label, val]) => (
                <React.Fragment key={label}>
                  <dt className="col-4 text-muted small">{label}</dt>
                  <dd className="col-8 mb-2">{val}</dd>
                </React.Fragment>
              ))}
            </dl>
            {meeting.description && (
              <>
                <hr />
                <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{meeting.description}</p>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'attendance' && (
        <>
          {canEdit && meeting.status !== 'cancelled' && (
            <div className="mb-4">
              <AttendanceRecorder meeting={meeting} onSaved={refreshMeeting} />
            </div>
          )}
          {(meeting.attendances || []).length > 0 && (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white fw-semibold">Recorded Attendance</div>
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead className="table-light">
                    <tr><th>Member</th><th>Status</th><th>Notes</th></tr>
                  </thead>
                  <tbody>
                    {meeting.attendances.map(a => (
                      <tr key={a.id}>
                        <td>{a.member_name}</td>
                        <td><StatusBadge status={a.status} /></td>
                        <td className="text-muted small">{a.notes || '—'}</td>
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

// ── Create Meeting form ───────────────────────────────────────────────────────
function CreateMeetingForm({ equbs, onSaved, onCancel }) {
  const [form, setForm] = useState({
    equb: '', title: '', description: '',
    meeting_date: '', location: '', status: 'upcoming',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);
  const set = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createMeeting({ ...form, equb: Number(form.equb) });
      onSaved();
    } catch (err) {
      setError(err?.response?.data || 'Failed to create meeting.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="ercms-page-header">
        <button className="btn btn-link p-0 text-muted small mb-1" onClick={onCancel}>
          <i className="bi bi-arrow-left me-1" />Back
        </button>
        <h1>Schedule a Meeting</h1>
      </div>
      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <ErrorMessage error={error} onDismiss={() => setError(null)} />
          <form onSubmit={handleSubmit} noValidate>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Equb Group <span className="text-danger">*</span></label>
                <select name="equb" className="form-select" value={form.equb} onChange={set} disabled={saving} required>
                  <option value="">— Select Equb —</option>
                  {(equbs || []).filter(e => e.status === 'active').map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Title <span className="text-danger">*</span></label>
                <input name="title" type="text" className="form-control" value={form.title} onChange={set} disabled={saving} required placeholder="e.g. Monthly Q4 Meeting" />
              </div>
              <div className="col-md-5">
                <label className="form-label fw-semibold">Date & Time <span className="text-danger">*</span></label>
                <input name="meeting_date" type="datetime-local" className="form-control" value={form.meeting_date} onChange={set} disabled={saving} required />
              </div>
              <div className="col-md-7">
                <label className="form-label fw-semibold">Location</label>
                <input name="location" type="text" className="form-control" value={form.location} onChange={set} disabled={saving} placeholder="Room 4B / Google Meet link" />
              </div>
              <div className="col-12">
                <label className="form-label fw-semibold">Description</label>
                <textarea name="description" className="form-control" rows={2} value={form.description} onChange={set} disabled={saving} />
              </div>
            </div>
            <div className="d-flex gap-2 mt-4">
              <button type="submit" className="btn btn-ercms-primary" disabled={saving || !form.equb || !form.title || !form.meeting_date}>
                {saving ? <><span className="spinner-border spinner-border-sm me-2" />Creating…</> : 'Schedule Meeting'}
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
export default function MeetingsPage() {
  const { user } = useAuth();
  const [view, setView]       = useState('list');
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: meetings, isLoading, error, refetch } = useFetch(listMeetings, []);
  const { data: equbs } = useFetch(listEqubs, []);

  const displayed = (meetings || []).filter(
    m => statusFilter === 'all' || m.status === statusFilter
  );

  const canCreate = user?.role === 'admin' || user?.role === 'organizer';

  if (view === 'create') {
    return <CreateMeetingForm equbs={equbs} onSaved={() => { refetch(); setView('list'); }} onCancel={() => setView('list')} />;
  }

  if (view === 'detail' && selected) {
    return <MeetingDetail meeting={selected} onBack={() => setView('list')} />;
  }

  return (
    <div>
      <div className="ercms-page-header d-flex justify-content-between align-items-center">
        <div>
          <h1>Meetings</h1>
          <p className="text-muted mb-0">Schedule and track Equb group meetings.</p>
        </div>
        {canCreate && (
          <button className="btn btn-ercms-primary" onClick={() => setView('create')}>
            <i className="bi bi-calendar-plus me-2" />Schedule Meeting
          </button>
        )}
      </div>

      <div className="mb-3 d-flex gap-2 flex-wrap">
        {['all', 'upcoming', 'completed', 'cancelled'].map(s => (
          <button key={s}
            className={`btn btn-sm ${statusFilter === s ? 'btn-dark' : 'btn-outline-secondary'}`}
            onClick={() => setStatusFilter(s)}>
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            {s !== 'all' && meetings && (
              <span className="ms-1 badge bg-secondary">{meetings.filter(m => m.status === s).length}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading && <LoadingSpinner message="Loading meetings…" />}
      {error && <ErrorMessage error={error} />}

      {!isLoading && !error && (
        displayed.length === 0 ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5">
              <i className="bi bi-calendar3 text-muted" style={{ fontSize: '2.5rem' }} aria-hidden="true" />
              <p className="text-muted mt-2 mb-0">No meetings found.</p>
              {canCreate && (
                <button className="btn btn-ercms-primary mt-3" onClick={() => setView('create')}>
                  Schedule the first meeting
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="row g-3">
            {displayed.map(m => (
              <div className="col-12 col-md-6" key={m.id}>
                <div className="card border-0 shadow-sm h-100 ercms-stat-card">
                  <div className="card-body">
                    <div className="d-flex justify-content-between mb-1">
                      <h6 className="fw-bold mb-0">{m.title}</h6>
                      <StatusBadge status={m.status} />
                    </div>
                    <p className="text-muted small mb-2">{m.equb_name}</p>
                    <div className="d-flex gap-3 small text-muted mb-3">
                      <span><i className="bi bi-calendar me-1" />{new Date(m.meeting_date).toLocaleDateString()}</span>
                      <span><i className="bi bi-clock me-1" />{new Date(m.meeting_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {m.location && <span><i className="bi bi-geo-alt me-1" />{m.location}</span>}
                    </div>
                    <button className="btn btn-sm btn-outline-primary w-100"
                      onClick={async () => {
                        const detail = await getMeeting(m.id);
                        setSelected(detail);
                        setView('detail');
                      }}>
                      View Details
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
