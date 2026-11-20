import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function AuditorDashboard() {
  const { user } = useAuth();
  return (
    <div>
      <div className="ercms-page-header">
        <h1>Auditor Dashboard</h1>
        <p className="text-muted mb-0">Welcome, {user?.first_name}. Review financial records and audit logs.</p>
      </div>

      <div className="row g-3 mb-4">
        {[
          { icon: 'bi-shield-check',   label: 'Audit Log',       colour: 'danger',   to: '/audit-log' },
          { icon: 'bi-bar-chart-line', label: 'Reports',         colour: 'info',     to: '/reports' },
          { icon: 'bi-cash-coin',      label: 'Contributions',   colour: 'success',  to: '/contributions' },
          { icon: 'bi-wallet2',        label: 'Payouts',         colour: 'primary',  to: '/payouts' },
        ].map((c) => (
          <div className="col-6 col-lg-3" key={c.to}>
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
                  <div className="text-muted small fw-semibold">{c.label}</div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white fw-semibold">Quick Access</div>
        <div className="card-body d-flex flex-wrap gap-2">
          <Link to="/audit-log"  className="btn btn-outline-danger btn-sm"><i className="bi bi-shield-check me-1" />View Audit Log</Link>
          <Link to="/reports"    className="btn btn-outline-info btn-sm"><i className="bi bi-bar-chart me-1" />Financial Reports</Link>
        </div>
      </div>
    </div>
  );
}
