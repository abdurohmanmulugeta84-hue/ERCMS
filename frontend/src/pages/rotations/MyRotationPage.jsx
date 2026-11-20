/**
 * MyRotationPage — Member view of their rotation positions.
 */
import React from 'react';
import { useFetch } from '../../hooks/useFetch';
import { getMyRotationEntries } from '../../api/rotationsApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import StatusBadge from '../../components/common/StatusBadge';

export default function MyRotationPage() {
  const { data: entries, isLoading, error } = useFetch(getMyRotationEntries, []);

  return (
    <div>
      <div className="ercms-page-header">
        <h1>My Rotation Schedule</h1>
        <p className="text-muted mb-0">Your assigned positions in Equb rotation schedules.</p>
      </div>

      {isLoading && <LoadingSpinner message="Loading rotation entries…" />}
      {error && <ErrorMessage error={error} />}

      {!isLoading && !error && (
        (!entries || entries.length === 0) ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5">
              <i className="bi bi-arrow-repeat text-muted" style={{ fontSize: '2.5rem' }} aria-hidden="true" />
              <p className="text-muted mt-2 mb-0">
                You haven't been assigned a rotation position yet.
              </p>
              <p className="text-muted small">Contact your Equb Organizer to be added to the schedule.</p>
            </div>
          </div>
        ) : (
          <div className="row g-3">
            {entries.map(entry => (
              <div className="col-12 col-md-6 col-lg-4" key={entry.id}>
                <div className={`card border-0 shadow-sm h-100 ercms-stat-card
                  ${entry.status === 'completed' ? 'border-start border-4 border-success' : ''}
                  ${entry.status === 'pending'   ? 'border-start border-4 border-secondary' : ''}
                  ${entry.status === 'scheduled' ? 'border-start border-4 border-info' : ''}
                `}>
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <span className="badge bg-dark me-2">Position #{entry.position}</span>
                        <StatusBadge status={entry.status} />
                      </div>
                      {entry.has_payout && (
                        <span className="badge bg-success">
                          <i className="bi bi-check-circle me-1" />Paid
                        </span>
                      )}
                    </div>
                    <dl className="row small mb-0 mt-2">
                      <dt className="col-5 text-muted">Expected date</dt>
                      <dd className="col-7">{entry.expected_payout_date || '—'}</dd>
                      {entry.notes && (
                        <>
                          <dt className="col-5 text-muted">Notes</dt>
                          <dd className="col-7">{entry.notes}</dd>
                        </>
                      )}
                    </dl>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
