import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { listUsers } from '../../api/authApi';
import { listEqubs } from '../../api/equbsApi';

const QuickCard = ({ icon, label, value, colour, to, badge }) => (
  <div className="col-6 col-lg-3">
    <Link to={to} className="text-decoration-none">
      <div className={`card ercms-stat-card h-100 border-start border-4 border-${colour}`}>
        <div className="card-body d-flex align-items-center gap-3">
          <div
            className={`rounded-circle d-flex align-items-center justify-content-center text-${colour} flex-shrink-0`}
            style={{ width: 48, height: 48, background: 'var(--ercms-primary-light)', fontSize: '1.3rem' }}
            aria-hidden="true"
          >
            <i className={`bi ${icon}`} />
          </div>
          <div>
            <div className="fw-bold fs-4 lh-1">
              {value}
              {badge != null && badge > 0 && (
                <span className="badge bg-warning text-dark ms-1" style={{ fontSize: '0.55rem' }}>
                  {badge} pending
                </span>
              )}
            </div>
            <div className="text-muted small">{label}</div>
          </div>
        </div>
      </div>
    </Link>
  </div>
);

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: users }  = useFetch(listUsers, []);
  const { data: equbs }  = useFetch(listEqubs, []);

  const totalUsers    = users?.length ?? '—';
  const inactiveCount = users ? users.filter(u => !u.is_active).length : null;
  const totalEqubs    = equbs?.length ?? '—';
  const activeEqubs   = equbs ? equbs.filter(e => e.status === 'active').length : null;

  return (
    <div>
      <div className="ercms-page-header">
        <h1>Administrator Dashboard</h1>
        <p className="text-muted mb-0">Welcome, {user?.first_name}. Here is an overview of the system.</p>
      </div>

      <div className="row g-3 mb-4">
        <QuickCard
          icon="bi-people-fill" label="Total Users" value={totalUsers} colour="primary"
          to="/admin/users" badge={inactiveCount}
        />
        <QuickCard
          icon="bi-collection-fill" label="Equb Groups"
          value={activeEqubs != null ? `${activeEqubs} active` : totalEqubs}
          colour="success" to="/equbs"
        />
        <QuickCard icon="bi-cash-coin"    label="Contributions" value="—" colour="warning" to="/contributions" />
        <QuickCard icon="bi-shield-check" label="Audit Events"  value="—" colour="danger"  to="/audit-log" />
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white fw-semibold">Quick Actions</div>
        <div className="card-body d-flex flex-wrap gap-2">
          <Link to="/admin/users"  className="btn btn-outline-primary btn-sm"><i className="bi bi-person-plus me-1" />Manage Users</Link>
          <Link to="/equbs"        className="btn btn-outline-success btn-sm"><i className="bi bi-plus-circle me-1" />Equb Groups</Link>
          <Link to="/memberships"  className="btn btn-outline-info btn-sm"><i className="bi bi-person-badge me-1" />Memberships</Link>
          <Link to="/reports"      className="btn btn-outline-secondary btn-sm"><i className="bi bi-bar-chart me-1" />Reports</Link>
          <Link to="/audit-log"    className="btn btn-outline-danger btn-sm"><i className="bi bi-shield-check me-1" />Audit Log</Link>
          <Link to="/admin/settings" className="btn btn-outline-dark btn-sm"><i className="bi bi-gear me-1" />System Overview</Link>
          <Link to="/admin/site"   className="btn btn-outline-warning btn-sm"><i className="bi bi-palette2 me-1" />Site Content</Link>
        </div>
      </div>
    </div>
  );
}
