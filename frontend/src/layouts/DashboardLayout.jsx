/**
 * DashboardLayout — authenticated shell with sidebar and top navigation bar.
 *
 * The sidebar shows only the navigation items that are relevant to the
 * logged-in user's role. The main content area renders the current route
 * via <Outlet />.
 */
import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { getUnreadCount } from '../api/notificationsApi';
import LogoDisplay from '../components/common/LogoDisplay';

// ── Navigation menu definition ──────────────────────────────────────────────
// Each item specifies which roles can see it.
// A null `section` means it goes in the first group with no label.

const NAV_ITEMS = [
  // Common
  { path: '/dashboard',         label: 'Dashboard',            icon: 'bi-speedometer2', roles: ['admin','organizer','treasurer','member','auditor'] },

  // Admin
  { section: 'Administration',  roles: ['admin'] },
  { path: '/admin/users',       label: 'User Management',      icon: 'bi-people',       roles: ['admin'] },
  { path: '/admin/settings',    label: 'System Overview',      icon: 'bi-gear',         roles: ['admin'] },
  { path: '/admin/site',        label: 'Site Content',         icon: 'bi-palette2',     roles: ['admin'] },

  // Organizer
  { section: 'Equb Management', roles: ['admin','organizer'] },
  { path: '/equbs',             label: 'Equb Groups',          icon: 'bi-collection',   roles: ['admin','organizer'] },
  { path: '/memberships',       label: 'Memberships',          icon: 'bi-person-badge', roles: ['admin','organizer'] },
  { path: '/meetings',          label: 'Meetings',             icon: 'bi-calendar3',    roles: ['admin','organizer'] },
  { path: '/rotations',         label: 'Rotation Schedule',    icon: 'bi-arrow-repeat', roles: ['admin','organizer'] },

  // Treasurer
  { section: 'Finance',         roles: ['admin','organizer','treasurer','auditor'] },
  { path: '/contributions',     label: 'Contributions',        icon: 'bi-cash-coin',    roles: ['admin','organizer','treasurer'] },
  { path: '/payouts',           label: 'Payouts',              icon: 'bi-wallet2',      roles: ['admin','organizer','treasurer'] },
  { path: '/withdrawals',       label: 'Withdrawals',          icon: 'bi-box-arrow-left', roles: ['admin','organizer','treasurer'] },
  { path: '/reports',           label: 'Reports',              icon: 'bi-bar-chart-line', roles: ['admin','organizer','treasurer','auditor'] },
  { path: '/audit-log',         label: 'Audit Log',            icon: 'bi-shield-check', roles: ['admin','auditor'] },

  // Member
  { section: 'My Equb',         roles: ['member'] },
  { path: '/my-equbs',          label: 'My Equb Groups',       icon: 'bi-collection',   roles: ['member'] },
  { path: '/my-contributions',  label: 'My Contributions',     icon: 'bi-cash-coin',    roles: ['member'] },
  { path: '/my-payouts',        label: 'My Payouts',           icon: 'bi-wallet2',      roles: ['member'] },
  { path: '/my-rotation',       label: 'Rotation Schedule',    icon: 'bi-arrow-repeat', roles: ['member'] },
  { path: '/withdrawal-request',label: 'Request Withdrawal',   icon: 'bi-box-arrow-left', roles: ['member'] },

  // All authenticated
  { section: 'Account',         roles: ['admin','organizer','treasurer','member','auditor'] },
  { path: '/notifications',     label: 'Notifications',        icon: 'bi-bell',         roles: ['admin','organizer','treasurer','member','auditor'] },
  { path: '/profile',           label: 'My Profile',           icon: 'bi-person-circle', roles: ['admin','organizer','treasurer','member','auditor'] },
];

// Role display names and badge colours
const ROLE_META = {
  admin:     { label: 'Administrator', colour: 'role-badge-admin' },
  organizer: { label: 'Organizer',     colour: 'role-badge-organizer' },
  treasurer: { label: 'Treasurer',     colour: 'role-badge-treasurer' },
  member:    { label: 'Member',        colour: 'role-badge-member' },
  auditor:   { label: 'Auditor',       colour: 'role-badge-auditor' },
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll unread count every 60 seconds
  useEffect(() => {
    let cancelled = false;
    const fetch = () => {
      getUnreadCount().then(data => {
        if (!cancelled) setUnreadCount(data.unread_count ?? 0);
      }).catch(() => {});
    };
    fetch();
    const interval = setInterval(fetch, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const role = user?.role ?? 'member';
  const roleMeta = ROLE_META[role] ?? { label: role, colour: '' };

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate('/', { replace: true });
  };

  // Filter items visible to this role
  const visibleItems = NAV_ITEMS.filter(
    (item) => item.roles?.includes(role)
  );

  return (
    <div>
      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <nav
        className={`ercms-sidebar ${sidebarOpen ? 'open' : ''}`}
        aria-label="Main navigation"
      >
        {/* Brand */}
        <a href="/dashboard" className="sidebar-brand" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>
          <LogoDisplay settings={settings} size={32} />
          <span>{settings?.site_name || 'ERCMS'}</span>
        </a>

        {/* Nav items */}
        <nav className="flex-grow-1 pt-2 overflow-auto">
          {visibleItems.map((item, idx) => {
            // Section label
            if (item.section) {
              return (
                <div key={`section-${idx}`} className="nav-section-label">
                  {item.section}
                </div>
              );
            }
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <i className={`bi ${item.icon}`} aria-hidden="true" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* User info + logout */}
        <div className="p-3 border-top border-white border-opacity-25">
          <div className="d-flex align-items-center gap-2 mb-2">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
              style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.25)', fontSize: '0.9rem' }}
              aria-hidden="true"
            >
              {user?.first_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="overflow-hidden">
              <div className="text-white fw-semibold text-truncate" style={{ fontSize: '0.85rem' }}>
                {user?.full_name || user?.username}
              </div>
              <span className={`badge ${roleMeta.colour}`} style={{ fontSize: '0.65rem' }}>
                {roleMeta.label}
              </span>
            </div>
          </div>
          <button
            className="btn btn-sm btn-outline-light w-100 d-flex align-items-center gap-1 justify-content-center"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <span className="spinner-border spinner-border-sm" aria-hidden="true" />
            ) : (
              <i className="bi bi-box-arrow-right" aria-hidden="true" />
            )}
            {loggingOut ? 'Logging out…' : 'Log Out'}
          </button>
        </div>
      </nav>

      {/* ── Main content area ──────────────────────────────────────────── */}
      <div className="ercms-main">
        {/* Top bar */}
        <header className="ercms-topbar" role="banner">
          {/* Mobile: sidebar toggle */}
          <button
            className="btn btn-link text-dark p-0 me-3 d-md-none"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Toggle navigation"
            aria-expanded={sidebarOpen}
          >
            <i className="bi bi-list fs-5" aria-hidden="true" />
          </button>

          <span className="fw-semibold text-muted" style={{ fontSize: '0.9rem' }}>
            Equb Rotation &amp; Contribution Management System
          </span>

          <div className="ms-auto d-flex align-items-center gap-3">
            <NavLink to="/notifications" className="text-dark text-decoration-none position-relative" aria-label="Notifications">
              <i className="bi bi-bell" style={{ fontSize: '1.1rem' }} aria-hidden="true" />
              {unreadCount > 0 && (
                <span
                  className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                  style={{ fontSize: '0.55rem' }}
                  aria-label={`${unreadCount} unread notifications`}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>
            <NavLink to="/profile" className="text-dark text-decoration-none" aria-label="My profile">
              <i className="bi bi-person-circle" style={{ fontSize: '1.1rem' }} aria-hidden="true" />
            </NavLink>
          </div>
        </header>

        {/* Page content */}
        <main className="ercms-content" id="main-content">
          <Outlet />
        </main>
      </div>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="d-md-none"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1025 }}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
