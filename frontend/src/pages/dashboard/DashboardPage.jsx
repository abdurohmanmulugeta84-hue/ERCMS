/**
 * DashboardPage — renders the role-specific dashboard for the logged-in user.
 */
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import AdminDashboard     from './AdminDashboard';
import OrganizerDashboard from './OrganizerDashboard';
import TreasurerDashboard from './TreasurerDashboard';
import MemberDashboard    from './MemberDashboard';
import AuditorDashboard   from './AuditorDashboard';

const DASHBOARD_MAP = {
  admin:     AdminDashboard,
  organizer: OrganizerDashboard,
  treasurer: TreasurerDashboard,
  member:    MemberDashboard,
  auditor:   AuditorDashboard,
};

export default function DashboardPage() {
  const { user } = useAuth();
  const Dashboard = DASHBOARD_MAP[user?.role] ?? MemberDashboard;
  return <Dashboard />;
}
