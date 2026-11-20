/**
 * PrivateRoute — redirects to / if the user is not authenticated.
 *
 * Optionally accepts an `allowedRoles` prop to restrict access by role.
 * Important: this is a UX guard only. All authorization is enforced on
 * the Django backend. Never rely on this component for security.
 *
 * Usage:
 *   <PrivateRoute />                          — any authenticated user
 *   <PrivateRoute allowedRoles={['admin']} /> — admins only
 */
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function PrivateRoute({ allowedRoles }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Show spinner while the session check is in progress
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <LoadingSpinner message="Loading…" />
      </div>
    );
  }

  // Not authenticated — redirect to landing page, preserving the intended destination
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Role check — show a 403-style page if the role is not permitted
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
