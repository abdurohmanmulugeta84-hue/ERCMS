/**
 * App.jsx — root router for the ERCMS React application.
 *
 * Route structure:
 *   /              → HomePage (landing page with glass login/register modals)
 *
 *   (authenticated)
 *   /dashboard          → role-aware dashboard
 *   /profile            → all roles
 *   /notifications      → all roles
 *
 *   /equbs, /memberships, /rotations, /meetings
 *                       → organizer + admin
 *   /contributions, /payouts, /withdrawals, /reports
 *                       → treasurer + admin  (auditor read-only in Phase 6)
 *   /audit-log          → admin + auditor
 *   /admin/users, /admin/settings → admin only
 *
 *   /my-equbs, /my-contributions, /my-payouts, /my-rotation,
 *   /withdrawal-request → member only
 *
 *   /unauthorized  → shown when role check fails
 *   *              → 404
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import DashboardLayout from './layouts/DashboardLayout';
import PrivateRoute    from './guards/PrivateRoute';

import HomePage         from './pages/HomePage';
import HelpPage          from './pages/HelpPage';

import DashboardPage    from './pages/dashboard/DashboardPage';
import ProfilePage      from './pages/ProfilePage';
import NotFoundPage     from './pages/NotFoundPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

// Phase 2 pages
import EqubsPage       from './pages/equbs/EqubsPage';
import MyEqubsPage     from './pages/equbs/MyEqubsPage';
import MembershipsPage from './pages/memberships/MembershipsPage';
import AdminUsersPage  from './pages/admin/AdminUsersPage';

// Phase 3 pages
import ContributionsPage   from './pages/contributions/ContributionsPage';
import MyContributionsPage from './pages/contributions/MyContributionsPage';

// Phase 4 pages
import RotationsPage    from './pages/rotations/RotationsPage';
import MyRotationPage   from './pages/rotations/MyRotationPage';
import PayoutsPage      from './pages/payouts/PayoutsPage';
import MyPayoutsPage    from './pages/payouts/MyPayoutsPage';

// Phase 5 pages
import MeetingsPage           from './pages/meetings/MeetingsPage';
import WithdrawalsPage        from './pages/withdrawals/WithdrawalsPage';
import WithdrawalRequestPage  from './pages/withdrawals/WithdrawalRequestPage';
import NotificationsPage      from './pages/notifications/NotificationsPage';

// Phase 6 pages
import ReportsPage         from './pages/reports/ReportsPage';
import AuditLogPage        from './pages/reports/AuditLogPage';
import SystemSettingsPage  from './pages/admin/SystemSettingsPage';
import SiteContentPage     from './pages/admin/SiteContentPage';

const STAFF_ROLES    = ['admin', 'organizer', 'treasurer', 'auditor'];
const ORG_ROLES      = ['admin', 'organizer'];
const FINANCE_ROLES  = ['admin', 'organizer', 'treasurer'];
const AUDIT_ROLES    = ['admin', 'auditor'];
const ADMIN_ONLY     = ['admin'];
const MEMBER_ONLY    = ['member'];
const ALL_ROLES      = ['admin', 'organizer', 'treasurer', 'member', 'auditor'];

export default function App() {
  return (
    <Routes>
      {/* ── Landing page (with glass login/register modals) ──────────── */}
      <Route index element={<HomePage />} />
      {/* Help / FAQ on a separate route */}
      <Route path="/help" element={<HelpPage />} />
      {/* Keep old routes as redirects for backward compatibility */}
      <Route path="/login"    element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Navigate to="/" replace />} />

      {/* ── Authenticated routes ───────────────────────────────────────── */}
      <Route element={<PrivateRoute allowedRoles={ALL_ROLES} />}>
        <Route element={<DashboardLayout />}>

          {/* Common */}
          <Route path="/dashboard"     element={<DashboardPage />} />
          <Route path="/profile"       element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* Organizer / Admin */}
          <Route element={<PrivateRoute allowedRoles={ORG_ROLES} />}>
            <Route path="/equbs"        element={<EqubsPage />} />
            <Route path="/equbs/new"    element={<EqubsPage />} />
            <Route path="/memberships"  element={<MembershipsPage />} />
            <Route path="/meetings"     element={<MeetingsPage />} />
            <Route path="/meetings/new" element={<MeetingsPage />} />
            <Route path="/rotations"    element={<RotationsPage />} />
          </Route>

          {/* Treasurer / Organizer / Admin */}
          <Route element={<PrivateRoute allowedRoles={FINANCE_ROLES} />}>
            <Route path="/contributions"     element={<ContributionsPage />} />
            <Route path="/contributions/new" element={<ContributionsPage />} />
            <Route path="/payouts"           element={<PayoutsPage />} />
            <Route path="/payouts/new"       element={<PayoutsPage />} />
            <Route path="/withdrawals"       element={<WithdrawalsPage />} />
          </Route>

          {/* Reports: Treasurer + Admin + Organizer + Auditor */}
          <Route element={<PrivateRoute allowedRoles={[...FINANCE_ROLES, 'auditor']} />}>
            <Route path="/reports" element={<ReportsPage />} />
          </Route>

          {/* Audit Log: Admin + Auditor */}
          <Route element={<PrivateRoute allowedRoles={AUDIT_ROLES} />}>
            <Route path="/audit-log" element={<AuditLogPage />} />
          </Route>

          {/* Admin only */}
          <Route element={<PrivateRoute allowedRoles={ADMIN_ONLY} />}>
            <Route path="/admin/users"    element={<AdminUsersPage />} />
            <Route path="/admin/settings" element={<SystemSettingsPage />} />
            <Route path="/admin/site"     element={<SiteContentPage />} />
          </Route>

          {/* Member only */}
          <Route element={<PrivateRoute allowedRoles={MEMBER_ONLY} />}>
            <Route path="/my-equbs"           element={<MyEqubsPage />} />
            <Route path="/my-contributions"   element={<MyContributionsPage />} />
            <Route path="/my-payouts"         element={<MyPayoutsPage />} />
            <Route path="/my-rotation"        element={<MyRotationPage />} />
            <Route path="/withdrawal-request" element={<WithdrawalRequestPage />} />
          </Route>

        </Route>
      </Route>

      {/* ── Utility routes ─────────────────────────────────────────────── */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*"             element={<NotFoundPage />} />
    </Routes>
  );
}
