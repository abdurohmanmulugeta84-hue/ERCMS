import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { listContributions } from '../../api/contributionsApi';
import { getMyMemberships } from '../../api/membershipsApi';
import { getMyPayouts } from '../../api/payoutsApi';
import { getMyRotationEntries } from '../../api/rotationsApi';

export default function MemberDashboard() {
  const { user } = useAuth();
  const { data: contributions } = useFetch(listContributions, []);
  const { data: memberships }   = useFetch(getMyMemberships, []);
  const { data: payouts }       = useFetch(getMyPayouts, []);
  const { data: rotationEntries } = useFetch(getMyRotationEntries, []);

  const totalContribs    = contributions?.length ?? '—';
  const verifiedContribs = contributions ? contributions.filter(c => c.status === 'verified').length : '—';
  const activeEqubs      = memberships ? memberships.filter(m => m.status === 'approved').length : '—';
  const totalPayouts     = payouts?.length ?? '—';
  const myPosition       = rotationEntries?.length > 0
    ? rotationEntries.find(e => e.status === 'pending' || e.status === 'scheduled')?.position
    : null;

  const stats = [
    { icon: 'bi-collection-fill', label: 'Active Equbs',      value: activeEqubs,       colour: 'success', to: '/my-equbs' },
    { icon: 'bi-cash-coin',       label: 'Contributions',      value: totalContribs,     colour: 'primary', to: '/my-contributions' },
    { icon: 'bi-arrow-repeat',    label: 'Next Position',      value: myPosition ? `#${myPosition}` : '—', colour: 'info', to: '/my-rotation' },
    { icon: 'bi-wallet2',         label: 'Payouts Received',   value: totalPayouts,      colour: 'warning', to: '/my-payouts' },
  ];

  return (
    <div>
      <div className="ercms-page-header">
        <h1>My Dashboard</h1>
        <p className="text-muted mb-0">Welcome, {user?.first_name}. Here is your Equb participation summary.</p>
      </div>

      <div className="row g-3 mb-4">
        {stats.map(c => (
          <div className="col-6 col-lg-3" key={c.to + c.label}>
            <Link to={c.to} className="text-decoration-none">
              <div className={`card ercms-stat-card h-100 border-start border-4 border-${c.colour}`}>
                <div className="card-body d-flex align-items-center gap-3">
                  <div
                    className={`rounded-circle text-${c.colour} d-flex align-items-center justify-content-center flex-shrink-0`}
                    style={{ width: 48, height: 48, background: 'var(--ercms-primary-light)', fontSize: '1.3rem' }}
                    aria-hidden="true"
                  >
                    <i className={`bi ${c.icon}`} />
                  </div>
                  <div>
                    <div className="fw-bold fs-4 lh-1">{c.value}</div>
                    <div className="text-muted small">{c.label}</div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white fw-semibold">Quick Actions</div>
        <div className="card-body d-flex flex-wrap gap-2">
          <Link to="/my-contributions"   className="btn btn-outline-primary btn-sm">
            <i className="bi bi-cash-coin me-1" />My Contributions
          </Link>
          <Link to="/my-equbs"           className="btn btn-outline-success btn-sm">
            <i className="bi bi-collection me-1" />My Equbs
          </Link>
          <Link to="/my-rotation"        className="btn btn-outline-info btn-sm">
            <i className="bi bi-arrow-repeat me-1" />Rotation
          </Link>
          <Link to="/withdrawal-request" className="btn btn-outline-warning btn-sm">
            <i className="bi bi-box-arrow-left me-1" />Request Withdrawal
          </Link>
        </div>
      </div>
    </div>
  );
}
