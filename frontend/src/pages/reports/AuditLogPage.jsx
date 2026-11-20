/**
 * AuditLogPage — Admin and Auditor view.
 * Filterable list of audit log entries.
 */
import React, { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { listAuditLogs } from '../../api/auditApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

const ACTION_ICONS = {
  user_created:           'bi-person-plus',
  user_updated:           'bi-person-gear',
  equb_created:           'bi-collection-plus',
  equb_updated:           'bi-collection',
  equb_status_changed:    'bi-arrow-left-right',
  membership_requested:   'bi-person-badge',
  membership_reviewed:    'bi-check2-circle',
  membership_status_changed: 'bi-arrow-left-right',
  contribution_submitted: 'bi-cash-coin',
  contribution_verified:  'bi-check-circle',
  payout_processed:      'bi-wallet2',
  payout_cancelled:      'bi-x-circle',
  meeting_created:        'bi-calendar-plus',
  withdrawal_requested:   'bi-box-arrow-left',
  withdrawal_reviewed:    'bi-check2-circle',
  rotation_schedule_created: 'bi-arrow-repeat',
  rotation_entry_assigned:  'bi-list-ol',
};

export default function AuditLogPage() {
  const [actionFilter, setActionFilter] = useState('');
  const [modelFilter, setModelFilter]   = useState('');

  const fetchFn = () => {
    const params = {};
    if (actionFilter) params.action = actionFilter;
    if (modelFilter) params.model_name = modelFilter;
    return listAuditLogs(params);
  };
  const { data: logs, isLoading, error } = useFetch(fetchFn, [actionFilter, modelFilter]);

  const ACTIONS = [
    '', 'user_created', 'user_updated', 'equb_created', 'equb_updated',
    'equb_status_changed', 'membership_requested', 'membership_reviewed',
    'contribution_submitted', 'contribution_verified', 'payout_processed',
    'payout_cancelled', 'meeting_created', 'withdrawal_requested', 'withdrawal_reviewed',
    'rotation_schedule_created', 'rotation_entry_assigned',
  ];
  const MODELS = ['', 'CustomUser', 'Equb', 'Membership', 'Contribution', 'Payment', 'Payout', 'Meeting', 'WithdrawalRequest', 'RotationSchedule', 'RotationEntry'];

  return (
    <div>
      <div className="ercms-page-header">
        <h1>Audit Log</h1>
        <p className="text-muted mb-0">System activity records for accountability and review.</p>
      </div>

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body py-2">
          <div className="row g-2 align-items-center">
            <div className="col-md-5">
              <select className="form-select form-select-sm" value={actionFilter}
                onChange={e => setActionFilter(e.target.value)} aria-label="Filter by action">
                <option value="">All Actions</option>
                {ACTIONS.filter(a => a).map(a => (
                  <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div className="col-md-5">
              <select className="form-select form-select-sm" value={modelFilter}
                onChange={e => setModelFilter(e.target.value)} aria-label="Filter by model">
                <option value="">All Models</option>
                {MODELS.filter(m => m).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2 text-end text-muted small">
              {logs?.length ?? 0} records
            </div>
          </div>
        </div>
      </div>

      {isLoading && <LoadingSpinner message="Loading audit log…" />}
      {error && <ErrorMessage error={error} />}

      {!isLoading && !error && (
        (!logs || logs.length === 0) ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5">
              <i className="bi bi-shield-check text-muted" style={{ fontSize: '2.5rem' }} aria-hidden="true" />
              <p className="text-muted mt-2 mb-0">No audit log entries match your filters.</p>
            </div>
          </div>
        ) : (
          <div className="card border-0 shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 40 }}></th>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Model</th>
                    <th>Object ID</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td>
                        <i className={`bi ${ACTION_ICONS[log.action] || 'bi-circle'} text-muted`} aria-hidden="true" />
                      </td>
                      <td className="text-muted small" style={{ whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="fw-semibold">{log.actor_name}</td>
                      <td>
                        <span className="badge bg-secondary bg-opacity-75">{log.action}</span>
                      </td>
                      <td className="text-muted small">{log.model_name}</td>
                      <td className="text-muted small font-monospace">{log.object_id || '—'}</td>
                      <td>
                        {log.detail && Object.keys(log.detail).length > 0 && (
                          <details className="small text-muted">
                            <summary className="cursor-pointer" style={{ listStyle: 'none' }}>
                              <i className="bi bi-info-circle me-1" />View
                            </summary>
                            <pre className="mt-1 mb-0 p-2 bg-light rounded" style={{ fontSize: '0.75rem' }}>
                              {JSON.stringify(log.detail, null, 2)}
                            </pre>
                          </details>
                        )}
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
