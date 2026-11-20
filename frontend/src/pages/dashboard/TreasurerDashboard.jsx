import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { listContributions } from '../../api/contributionsApi';
import { listPayouts } from '../../api/payoutsApi';

export default function TreasurerDashboard() {
  const { user } = useAuth();
  const { data: contributions } = useFetch(listContributions, []);
  const { data: payouts }       = useFetch(listPayouts, []);

  const pendingContribs  = contributions ? contributions.filter(c => c.status === 'submitted').length  : '—';
  const verifiedContribs = contributions ? contributions.filter(c => c.status === 'verified').length   : '—';
  const processedPayouts = payouts ? payouts.filter(p => p.status === 'processed').length : '—';
  const scheduledPayouts = payouts ? payouts.filter(p => p.status === 'scheduled').length : '—';

  const stats = [
    { icon: 'bi-hourglass-split',    label: 'Pending Verification', value: pendingContribs,  colour: 'warning',   to: '/contributions' },
    { icon: 'bi-check-circle',       label: 'Verified Contributions', value: verifiedContribs, colour: 'success', to: '/contributions' },
    { icon: 'bi-wallet2',            label: 'Payouts Processed',    value: processedPayouts, colour: 'primary',   to: '/payouts' },
    { icon: 'bi-hourglass',          label: 'Scheduled Payouts',    value: scheduledPayouts, colour: 'info',      to: '/payouts' },
  ];

  return (
    <div>
      <div className="ercms-page-header">
        <h1>Treasurer Dashboard</h1>
        <p className="text-muted mb-0">Welcome, {user?.first_name}. Track contributions and process payouts.</p>
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
          <Link to="/contributions" className="btn btn-outline-success btn-sm">
            <i className="bi bi-cash-coin me-1" />Contributions
          </Link>
          <Link to="/payouts" className="btn btn-outline-primary btn-sm">
            <i className="bi bi-wallet2 me-1" />Process Payout
          </Link>
          <Link to="/withdrawals" className="btn btn-outline-warning btn-sm">
            <i className="bi bi-box-arrow-left me-1" />Withdrawals
          </Link>
          <Link to="/reports" className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-bar-chart me-1" />Reports
          </Link>
        </div>
      </div>
    </div>
  );
}
