import React from 'react';
import { Link } from 'react-router-dom';

export default function UnauthorizedPage() {
  return (
    <div className="auth-wrapper">
      <div className="auth-card text-center">
        <i className="bi bi-shield-x text-danger" style={{ fontSize: '3.5rem' }} aria-hidden="true" />
        <h1 className="display-6 fw-bold mt-3">Access Denied</h1>
        <p className="text-muted">You do not have permission to view this page.</p>
        <Link to="/dashboard" className="btn btn-ercms-primary mt-2 px-4">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
