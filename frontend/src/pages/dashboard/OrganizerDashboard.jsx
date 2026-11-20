import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { getMyEqubs } from '../../api/equbsApi';
import { listMemberships } from '../../api/membershipsApi';
import { listMeetings } from '../../api/meetingsApi';
import { listWithdrawals } from '../../api/withdrawalsApi';

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const { data: myEqubs }      = useFetch(getMyEqubs, []);
  const { data: memberships }  = useFetch(() => listMemberships({}), []);
  const { data: meetings }     = useFetch(listMeetings, []);
  const { data: withdrawals }  = useFetch(listWithdrawals, []);

  const pendingMembers    = memberships ? memberships.filter(m => m.status === 'pending').length : '—';
  const upcomingMeetings  = meetings   ? meetings.filter(m => m.status === 'upcoming').length   : '—';
  const pendingWithdrawals = withdrawals ? withdrawals.filter(w => w.status === 'pending').length : '—';

  const stats = [
    { icon: 'bi-collection-fill', label: 'My Equb Groups',       value: myEqubs?.length ?? '—', colour: 'success', to: '/equbs' },
    { icon: 'bi-person-badge',    label: 'Pending Members',       value: pendingMembers,          colour: 'warning', to: '/memberships' },
    { icon: 'bi-calendar3',       label: 'Upcoming Meetings',     value: upcomingMeetings,        colour: 'info',    to: '/meetings' },
    { icon: 'bi-box-arrow-left',  label: 'Pending Withdrawals',   value: pendingWithdrawals,      colour: 'danger',  to: '/withdrawals' },
  ];

  return (
    <div>
      <div className="ercms-page-header">
        <h1>Organizer Dashboard</h1>
        <p className="text-muted mb-0">Welcome, {user?.first_name}. Manage your Equb groups and members.</p>
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
          <Link to="/equbs"        className="btn btn-outline-success btn-sm"><i className="bi bi-collection me-1" />Equb Groups</Link>
          <Link to="/memberships"  className="btn btn-outline-primary btn-sm"><i className="bi bi-person-badge me-1" />Members</Link>
          <Link to="/meetings"     className="btn btn-outline-info btn-sm"><i className="bi bi-calendar-plus me-1" />Meetings</Link>
          <Link to="/rotations"    className="btn btn-outline-secondary btn-sm"><i className="bi bi-arrow-repeat me-1" />Rotations</Link>
          <Link to="/withdrawals"  className="btn btn-outline-danger btn-sm"><i className="bi bi-box-arrow-left me-1" />Withdrawals</Link>
        </div>
      </div>
    </div>
  );
}
