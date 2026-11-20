/**
 * NotificationsPage — all roles.
 * Lists in-app notifications with read/unread toggle.
 */
import React, { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { listNotifications, markRead, markAllRead } from '../../api/notificationsApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

const TYPE_ICONS = {
  membership_approved:   'bi-person-check-fill text-success',
  membership_rejected:   'bi-person-x-fill text-danger',
  contribution_verified: 'bi-check-circle-fill text-success',
  contribution_rejected: 'bi-x-circle-fill text-danger',
  payout_processed:      'bi-wallet-fill text-primary',
  withdrawal_approved:   'bi-box-arrow-left text-success',
  withdrawal_rejected:   'bi-box-arrow-left text-danger',
  meeting_scheduled:     'bi-calendar-check-fill text-info',
  meeting_cancelled:     'bi-calendar-x-fill text-danger',
  general:               'bi-bell-fill text-secondary',
};

export default function NotificationsPage() {
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [markingAll, setMarkingAll]         = useState(false);
  const [actionError, setActionError]       = useState(null);

  const fetchFn = () => listNotifications(showUnreadOnly ? { unread: 'true' } : {});
  const { data: notifications, isLoading, error, refetch } = useFetch(fetchFn, [showUnreadOnly]);

  const unreadCount = (notifications || []).filter(n => !n.is_read).length;

  const handleMarkRead = async (id) => {
    try {
      await markRead(id);
      refetch();
    } catch { /* silent */ }
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    setActionError(null);
    try {
      await markAllRead();
      refetch();
    } catch (err) {
      setActionError('Failed to mark all as read.');
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div>
      <div className="ercms-page-header d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h1>Notifications</h1>
          <p className="text-muted mb-0">
            {notifications ? `${notifications.length} total` : ''}
            {unreadCount > 0 && (
              <span className="badge bg-warning text-dark ms-2">{unreadCount} unread</span>
            )}
          </p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <div className="form-check form-switch mb-0">
            <input className="form-check-input" type="checkbox" id="unreadToggle"
              checked={showUnreadOnly} onChange={e => setShowUnreadOnly(e.target.checked)}
              role="switch" aria-label="Show unread only" />
            <label className="form-check-label small" htmlFor="unreadToggle">Unread only</label>
          </div>
          {unreadCount > 0 && (
            <button className="btn btn-sm btn-outline-secondary" onClick={handleMarkAll} disabled={markingAll}>
              {markingAll ? <span className="spinner-border spinner-border-sm" /> : 'Mark all read'}
            </button>
          )}
        </div>
      </div>

      {actionError && <ErrorMessage error={actionError} onDismiss={() => setActionError(null)} />}
      {isLoading && <LoadingSpinner message="Loading notifications…" />}
      {error && <ErrorMessage error={error} />}

      {!isLoading && !error && (
        (!notifications || notifications.length === 0) ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5">
              <i className="bi bi-bell-slash text-muted" style={{ fontSize: '2.5rem' }} aria-hidden="true" />
              <p className="text-muted mt-2 mb-0">
                {showUnreadOnly ? 'No unread notifications.' : 'No notifications yet.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="card border-0 shadow-sm">
            <ul className="list-group list-group-flush">
              {notifications.map(n => {
                const iconClass = TYPE_ICONS[n.notification_type] || TYPE_ICONS.general;
                return (
                  <li
                    key={n.id}
                    className={`list-group-item d-flex align-items-start gap-3 py-3 px-4
                      ${!n.is_read ? 'bg-light' : ''}`}
                    aria-label={n.is_read ? 'Read notification' : 'Unread notification'}
                  >
                    <div className="flex-shrink-0 mt-1">
                      <i className={`bi ${iconClass}`} style={{ fontSize: '1.2rem' }} aria-hidden="true" />
                    </div>
                    <div className="flex-grow-1 overflow-hidden">
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <span className={`fw-semibold ${!n.is_read ? '' : 'text-muted'}`}>
                          {n.title}
                        </span>
                        <span className="text-muted small flex-shrink-0">
                          {new Date(n.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-muted small mb-0 mt-1" style={{ whiteSpace: 'pre-wrap' }}>
                        {n.message}
                      </p>
                      <div className="d-flex align-items-center gap-2 mt-2">
                        <span className="badge bg-secondary bg-opacity-50 text-dark" style={{ fontSize: '0.65rem' }}>
                          {n.type_display}
                        </span>
                        {n.email_sent && (
                          <span className="text-muted small">
                            <i className="bi bi-envelope-check me-1" aria-hidden="true" />Email sent
                          </span>
                        )}
                      </div>
                    </div>
                    {!n.is_read && (
                      <button
                        className="btn btn-sm btn-link text-muted p-0 flex-shrink-0 mt-1"
                        onClick={() => handleMarkRead(n.id)}
                        aria-label="Mark as read"
                        title="Mark as read"
                      >
                        <i className="bi bi-check-circle" aria-hidden="true" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )
      )}
    </div>
  );
}
