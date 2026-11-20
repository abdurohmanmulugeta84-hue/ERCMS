import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="auth-wrapper">
      <div className="auth-card text-center">
        <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '3.5rem' }} aria-hidden="true" />
        <h1 className="display-6 fw-bold mt-3">404 — Not Found</h1>
        <p className="text-muted">The page you are looking for does not exist.</p>
        <Link to="/dashboard" className="btn btn-ercms-primary mt-2 px-4">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
