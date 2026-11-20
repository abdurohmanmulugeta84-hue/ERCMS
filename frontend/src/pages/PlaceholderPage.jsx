/**
 * PlaceholderPage — used for routes that haven't been implemented yet.
 * Accepts `title` and `phase` props so each route has a meaningful label.
 */
import React from 'react';

export default function PlaceholderPage({ title = 'Coming Soon', phase = '2' }) {
  return (
    <div>
      <div className="ercms-page-header">
        <h1>{title}</h1>
      </div>
      <div className="card border-0 shadow-sm">
        <div className="card-body text-center py-5">
          <i className="bi bi-tools text-muted" style={{ fontSize: '3rem' }} aria-hidden="true" />
          <h4 className="mt-3 text-muted">Under Construction</h4>
          <p className="text-muted mb-0">
            This section will be implemented in <strong>Phase {phase}</strong> of development.
          </p>
        </div>
      </div>
    </div>
  );
}
