/**
 * AdminUsersPage — System Administrator only.
 *
 * Lists all users. Allows:
 *   - Activate / deactivate accounts
 *   - Change role
 *   - Filter by role and active status
 */
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { listUsers, updateUser } from '../../api/authApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const ROLE_OPTIONS = [
  { value: 'admin',     label: 'Administrator' },
  { value: 'organizer', label: 'Organizer' },
  { value: 'treasurer', label: 'Treasurer' },
  { value: 'member',    label: 'Member' },
  { value: 'auditor',   label: 'Auditor' },
];

const ROLE_BADGE = {
  admin:     'role-badge-admin',
  organizer: 'role-badge-organizer',
  treasurer: 'role-badge-treasurer',
  member:    'role-badge-member',
  auditor:   'role-badge-auditor',
};

// ── Inline role editor ────────────────────────────────────────────────────────
function RoleEditor({ user: u, onSaved, currentUser }) {
  const [editing, setEditing] = useState(false);
  const [role, setRole]     = useState(u.role);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  // Prevent admins from changing their own role accidentally
  const isSelf = currentUser?.id === u.id;

  const handleSave = async () => {
    if (role === u.role) { setEditing(false); return; }
    setSaving(true);
    setError(null);
    try {
      await updateUser(u.id, { role });
      onSaved();
      setEditing(false);
    } catch (err) {
      setError(err?.response?.data?.role?.[0] || 'Failed to update role.');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="d-flex align-items-center gap-2">
        <span className={`badge ${ROLE_BADGE[u.role]}`}>
          {ROLE_OPTIONS.find(r => r.value === u.role)?.label || u.role}
        </span>
        {!isSelf && (
          <button className="btn btn-link btn-sm p-0 text-muted" onClick={() => setEditing(true)}
            title="Change role" aria-label="Change role">
            <i className="bi bi-pencil-square" aria-hidden="true" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="d-flex align-items-center gap-1">
      <select className="form-select form-select-sm" style={{ width: 140 }}
        value={role} onChange={e => setRole(e.target.value)} disabled={saving}>
        {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
      <button className="btn btn-sm btn-success" onClick={handleSave} disabled={saving}
        aria-label="Save role change">
        {saving ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-check-lg" />}
      </button>
      <button className="btn btn-sm btn-outline-secondary" onClick={() => { setRole(u.role); setEditing(false); }}
        disabled={saving} aria-label="Cancel role change">
        <i className="bi bi-x-lg" />
      </button>
      {error && <span className="text-danger small">{error}</span>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [roleFilter, setRoleFilter]     = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch]             = useState('');
  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggling, setToggling]         = useState(false);
  const [actionError, setActionError]   = useState(null);

  const { data: users, isLoading, error, refetch } = useFetch(listUsers, []);

  // ── Filters ──────────────────────────────────────────────────────────────
  const filtered = (users ?? []).filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (activeFilter === 'active'   && !u.is_active) return false;
    if (activeFilter === 'inactive' && u.is_active)  return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.full_name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ── Toggle active ──────────────────────────────────────────────────────
  const handleToggleActive = async () => {
    setToggling(true);
    setActionError(null);
    try {
      await updateUser(toggleTarget.id, { is_active: !toggleTarget.is_active });
      await refetch();
      setToggleTarget(null);
    } catch (err) {
      setActionError(err?.response?.data || 'Failed to update account status.');
    } finally {
      setToggling(false);
    }
  };

  const pendingCount = (users ?? []).filter(u => !u.is_active).length;

  return (
    <div>
      <div className="ercms-page-header d-flex justify-content-between align-items-start">
        <div>
          <h1>User Management</h1>
          <p className="text-muted mb-0">
            {users ? `${users.length} users total` : ''}
            {pendingCount > 0 && (
              <span className="badge bg-warning text-dark ms-2">{pendingCount} pending activation</span>
            )}
          </p>
        </div>
      </div>

      {actionError && <ErrorMessage error={actionError} onDismiss={() => setActionError(null)} />}

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body py-2">
          <div className="row g-2 align-items-center">
            <div className="col-md-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text" aria-hidden="true"><i className="bi bi-search" /></span>
                <input
                  type="search" className="form-control" placeholder="Search name, email, username…"
                  value={search} onChange={e => setSearch(e.target.value)}
                  aria-label="Search users"
                />
              </div>
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)} aria-label="Filter by role">
                <option value="all">All Roles</option>
                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={activeFilter}
                onChange={e => setActiveFilter(e.target.value)} aria-label="Filter by status">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive (pending)</option>
              </select>
            </div>
            <div className="col-md-2 text-end text-muted small">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {isLoading && <LoadingSpinner message="Loading users…" />}
      {error && <ErrorMessage error={error} />}

      {!isLoading && !error && (
        <div className="card border-0 shadow-sm">
          {filtered.length === 0 ? (
            <div className="card-body text-center py-5">
              <i className="bi bi-people text-muted" style={{ fontSize: '2.5rem' }} aria-hidden="true" />
              <p className="text-muted mt-2 mb-0">No users match your filters.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id} className={!u.is_active ? 'table-warning' : ''}>
                      <td className="fw-semibold">{u.full_name || '—'}</td>
                      <td className="text-muted small">{u.username}</td>
                      <td className="text-muted small">{u.email}</td>
                      <td>
                        <RoleEditor user={u} currentUser={currentUser} onSaved={refetch} />
                      </td>
                      <td>
                        {u.is_active
                          ? <span className="badge bg-success">Active</span>
                          : <span className="badge bg-warning text-dark">Inactive</span>}
                      </td>
                      <td className="text-muted small">
                        {new Date(u.date_joined).toLocaleDateString()}
                      </td>
                      <td>
                        {currentUser?.id !== u.id && (
                          <button
                            className={`btn btn-sm ${u.is_active ? 'btn-outline-warning' : 'btn-outline-success'}`}
                            onClick={() => setToggleTarget(u)}
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        show={!!toggleTarget}
        title={toggleTarget?.is_active ? 'Deactivate Account' : 'Activate Account'}
        message={
          toggleTarget?.is_active
            ? `Deactivate ${toggleTarget?.full_name || toggleTarget?.username}? They will not be able to log in.`
            : `Activate ${toggleTarget?.full_name || toggleTarget?.username}? They will be able to log in.`
        }
        confirmLabel={toggleTarget?.is_active ? 'Deactivate' : 'Activate'}
        confirmStyle={toggleTarget?.is_active ? 'warning' : 'success'}
        isLoading={toggling}
        onConfirm={handleToggleActive}
        onCancel={() => setToggleTarget(null)}
      />
    </div>
  );
}
