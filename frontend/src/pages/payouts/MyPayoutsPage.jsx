/**
 * MyPayoutsPage — Member view of their received payouts.
 */
import React from 'react';
import { useFetch } from '../../hooks/useFetch';
import { getMyPayouts } from '../../api/payoutsApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import StatusBadge from '../../components/common/StatusBadge';

export default function MyPayoutsPage() {
  const { data: payouts, isLoading, error } = useFetch(getMyPayouts, []);

  const totalReceived = (payouts || [])
    .filter(p => p.status === 'processed')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div>
      <div className="ercms-page-header">
        <h1>My Payouts</h1>
        <p className="text-muted mb-0">Payouts you have received from your Equb groups.</p>
      </div>

      {payouts && payouts.length > 0 && (
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm border-start border-4 border-success">
              <div className="card-body py-2">
                <div className="fw-bold fs-4 text-success">
                  ETB {totalReceived.toLocaleString()}
                </div>
                <div className="text-muted small">Total Received</div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm border-start border-4 border-primary">
              <div className="card-body py-2">
                <div className="fw-bold fs-4 text-primary">
                  {payouts.filter(p => p.status === 'processed').length}
                </div>
                <div className="text-muted small">Processed Payouts</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading && <LoadingSpinner message="Loading your payouts…" />}
      {error && <ErrorMessage error={error} />}

      {!isLoading && !error && (
        (!payouts || payouts.length === 0) ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5">
              <i className="bi bi-wallet2 text-muted" style={{ fontSize: '2.5rem' }} aria-hidden="true" />
              <p className="text-muted mt-2 mb-0">You haven't received any payouts yet.</p>
              <p className="text-muted small">Payouts are processed by your Treasurer according to the rotation schedule.</p>
            </div>
          </div>
        ) : (
          <div className="card border-0 shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Reference</th>
                    <th>Equb Group</th>
                    <th>Position</th>
                    <th>Amount (ETB)</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map(p => (
                    <tr key={p.id}>
                      <td className="font-monospace small text-muted">{p.payout_reference}</td>
                      <td className="fw-semibold">{p.equb_name}</td>
                      <td>#{p.position}</td>
                      <td className="fw-semibold">{Number(p.amount).toLocaleString()}</td>
                      <td className="text-muted small">{p.method_display}</td>
                      <td><StatusBadge status={p.status} /></td>
                      <td className="text-muted small">
                        {p.processed_at
                          ? new Date(p.processed_at).toLocaleDateString()
                          : new Date(p.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
