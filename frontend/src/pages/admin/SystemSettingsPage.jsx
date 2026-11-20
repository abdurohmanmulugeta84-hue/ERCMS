/**
 * SystemSettingsPage — Admin only.
 * Shows system-wide overview statistics from /api/reports/system-overview/.
 */
import React from 'react';
import { useFetch } from '../../hooks/useFetch';
import { getSystemOverview } from '../../api/reportsApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

const ROLE_BADGES = {
  admin:     'role-badge-admin',
  organizer: 'role-badge-organizer',
  treasurer: 'role-badge-treasurer',
  member:    'role-badge-member',
  auditor:   'role-badge-auditor',
};
const ROLE_LABELS = { admin: 'Administrators', organizer: 'Organizers', treasurer: 'Treasurers', member: 'Members', auditor: 'Auditors' };

export default function SystemSettingsPage() {
  const { data: overview, isLoading, error } = useFetch(getSystemOverview, []);

  if (isLoading) return <LoadingSpinner message="Loading system overview…" />;
  if (error)     return <ErrorMessage error={error} />;

  if (!overview) return null;

  return (
    <div>
      <div className="ercms-page-header">
        <h1>System Settings</h1>
        <p className="text-muted mb-0">System-wide overview and configuration.</p>
      </div>

      {/* Users section */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-header bg-white fw-semibold">
          <i className="bi bi-people me-2" />User Accounts
        </div>
        <div className="card-body">
          <div className="row g-3 mb-3">
            <div className="col-6 col-md-4">
              <div className="card border-0 bg-light h-100">
                <div className="card-body text-center py-3">
                  <div className="fw-bold fs-3">{overview.users.total}</div>
                  <div className="text-muted small">Total Users</div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-4">
              <div className="card border-0 bg-light h-100">
                <div className="card-body text-center py-3">
                  <div className="fw-bold fs-3 text-success">{overview.users.active}</div>
                  <div className="text-muted small">Active</div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-4">
              <div className="card border-0 bg-light h-100">
                <div className="card-body text-center py-3">
                  <div className="fw-bold fs-3 text-warning">{overview.users.inactive}</div>
                  <div className="text-muted small">Pending Activation</div>
                </div>
              </div>
            </div>
          </div>
          <div className="row g-2">
            {Object.entries(overview.users.by_role).map(([role, count]) => (
              <div className="col-6 col-md" key={role}>
                <div className="d-flex align-items-center gap-2 p-2 border rounded">
                  <span className={`badge ${ROLE_BADGES[role]}`}>
                    {ROLE_LABELS[role] || role}
                  </span>
                  <span className="fw-bold">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System data section */}
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">
              <i className="bi bi-collection me-2" />Equb Groups
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Total</span><span className="fw-bold">{overview.equbs.total}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Active</span>
                <span className="fw-bold text-success">{overview.equbs.active}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Completed</span>
                <span className="fw-bold text-info">{overview.equbs.completed}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">
              <i className="bi bi-cash-coin me-2" />Financial Activity
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Contributions (verified)</span>
                <span className="fw-bold">{overview.contributions.verified}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Contributions (pending)</span>
                <span className="fw-bold text-warning">{overview.contributions.pending}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Payouts (processed)</span>
                <span className="fw-bold text-success">{overview.payouts.processed}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Payouts (scheduled)</span>
                <span className="fw-bold text-info">{overview.payouts.scheduled}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">
              <i className="bi bi-calendar3 me-2" />Meetings
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Total</span><span className="fw-bold">{overview.meetings.total}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Upcoming</span>
                <span className="fw-bold text-info">{overview.meetings.upcoming}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">
              <i className="bi bi-box-arrow-left me-2" />Withdrawal Requests
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Total</span><span className="fw-bold">{overview.withdrawals.total}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Pending Review</span>
                <span className="fw-bold text-warning">{overview.withdrawals.pending}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mt-3">
        <div className="card-header bg-white fw-semibold">
          <i className="bi bi-info-circle me-2" />System Information
        </div>
        <div className="card-body">
          <dl className="row mb-0 small">
            <dt className="col-md-3 text-muted">Application</dt>
            <dd className="col-md-9">Equb Rotation &amp; Contribution Management System (ERCMS)</dd>
            <dt className="col-md-3 text-muted">Backend</dt>
            <dd className="col-md-9">Django 5.2 + Django REST Framework</dd>
            <dt className="col-md-3 text-muted">Frontend</dt>
            <dd className="col-md-9">React 18 + Vite</dd>
            <dt className="col-md-3 text-muted">Database</dt>
            <dd className="col-md-9">SQLite (development) / PostgreSQL (production)</dd>
            <dt className="col-md-3 text-muted">Version</dt>
            <dd className="col-md-9">1.0</dd>
          </dl>
        </div>
      </div>
    </div>
  );
}
