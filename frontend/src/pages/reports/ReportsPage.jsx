/**
 * ReportsPage — Financial reports for Treasurer, Admin, Organizer, and Auditor.
 *
 * Select an Equb, then view:
 *   - Financial summary (totals, balance)
 *   - Per-member contribution breakdown
 *   - Payout history
 *   - Membership overview
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { listEqubs } from '../../api/equbsApi';
import {
  getFinancialSummary, getContributionReport,
  getPayoutReport, getMembershipReport,
} from '../../api/reportsApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import StatusBadge from '../../components/common/StatusBadge';

export default function ReportsPage() {
  const { user } = useAuth();
  const { data: equbs, isLoading: equbsLoading } = useFetch(listEqubs, []);

  // Filter equbs: organizer sees own, admin/treasurer/auditor see all
  const visibleEqubs = (equbs || []).filter(e => {
    if (user?.role === 'organizer') return e.organizer === user?.id;
    return true;
  });

  const [selectedEqub, setSelectedEqub] = useState('');
  const [activeTab, setActiveTab]     = useState('summary');
  const [summary, setSummary]       = useState(null);
  const [contributions, setContributions] = useState(null);
  const [payouts, setPayouts]        = useState(null);
  const [memberships, setMemberships] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  // Fetch data when equb or tab changes
  useEffect(() => {
    if (!selectedEqub) return;
    setLoading(true);
    setError(null);
    const fetchData = async () => {
      try {
        if (activeTab === 'summary')      setSummary(await getFinancialSummary(selectedEqub));
        if (activeTab === 'contributions') setContributions(await getContributionReport(selectedEqub));
        if (activeTab === 'payouts')      setPayouts(await getPayoutReport(selectedEqub));
        if (activeTab === 'memberships')  setMemberships(await getMembershipReport(selectedEqub));
      } catch (err) {
        setError(err?.response?.data?.detail || 'Failed to load report.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedEqub, activeTab]);

  if (equbsLoading) return <LoadingSpinner message="Loading Equb groups…" />;

  return (
    <div>
      <div className="ercms-page-header">
        <h1>Financial Reports</h1>
        <p className="text-muted mb-0">Generate reports for your Equb groups.</p>
      </div>

      {/* Equb selector */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body py-2">
          <div className="row g-2 align-items-center">
            <div className="col-md-6">
              <select className="form-select" value={selectedEqub}
                onChange={e => { setSelectedEqub(e.target.value); setActiveTab('summary'); }}
                aria-label="Select Equb">
                <option value="">— Select an Equb group —</option>
                {visibleEqubs.map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e.status_display})</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {!selectedEqub && (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <i className="bi bi-bar-chart-line text-muted" style={{ fontSize: '2.5rem' }} aria-hidden="true" />
            <p className="text-muted mt-2 mb-0">Select an Equb group to view its reports.</p>
          </div>
        </div>
      )}

      {selectedEqub && (
        <>
          {/* Tabs */}
          <ul className="nav nav-tabs mb-3" role="tablist">
            {[
              { key: 'summary',       label: 'Summary',       icon: 'bi-graph-up' },
              { key: 'contributions', label: 'Contributions',  icon: 'bi-cash-coin' },
              { key: 'payouts',       label: 'Payouts',        icon: 'bi-wallet2' },
              { key: 'memberships',   label: 'Memberships',    icon: 'bi-people' },
            ].map(t => (
              <li className="nav-item" key={t.key} role="presentation">
                <button className={`nav-link ${activeTab === t.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(t.key)} role="tab">
                  <i className={`bi ${t.icon} me-1`} aria-hidden="true" />{t.label}
                </button>
              </li>
            ))}
          </ul>

          {loading && <LoadingSpinner message="Loading report…" />}
          {error && <ErrorMessage error={error} />}

          {!loading && !error && activeTab === 'summary' && summary && (
            <div className="row g-3">
              {/* Equb info */}
              <div className="col-12">
                <div className="card border-0 shadow-sm">
                  <div className="card-body">
                    <h5 className="fw-bold mb-3">{summary.equb.name}</h5>
                    <div className="row g-3">
                      <div className="col-6 col-md-3">
                        <div className="text-muted small">Status</div>
                        <StatusBadge status={summary.equb.status} />
                      </div>
                      <div className="col-6 col-md-3">
                        <div className="text-muted small">Frequency</div>
                        <div className="fw-semibold">{summary.equb.frequency}</div>
                      </div>
                      <div className="col-6 col-md-3">
                        <div className="text-muted small">Contribution Amount</div>
                        <div className="fw-semibold">ETB {Number(summary.equb.contribution_amount).toLocaleString()}</div>
                      </div>
                      <div className="col-6 col-md-3">
                        <div className="text-muted small">Members</div>
                        <div className="fw-semibold">
                          {summary.members.approved}
                          {summary.members.max && ` / ${summary.members.max}`}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Contribution summary */}
              <div className="col-6 col-md-3">
                <div className="card border-0 shadow-sm border-start border-4 border-success h-100">
                  <div className="card-body py-3">
                    <div className="fw-bold fs-3 text-success">ETB {Number(summary.contributions.total_verified_amount).toLocaleString()}</div>
                    <div className="text-muted small">Total Verified Contributions</div>
                    <div className="text-muted small mt-1">{summary.contributions.verified_count} records</div>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card border-0 shadow-sm border-start border-4 border-warning h-100">
                  <div className="card-body py-3">
                    <div className="fw-bold fs-3 text-warning">{summary.contributions.pending_count}</div>
                    <div className="text-muted small">Pending Verification</div>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card border-0 shadow-sm border-start border-4 border-primary h-100">
                  <div className="card-body py-3">
                    <div className="fw-bold fs-3 text-primary">ETB {Number(summary.payouts.total_paid_amount).toLocaleString()}</div>
                    <div className="text-muted small">Total Paid Out</div>
                    <div className="text-muted small mt-1">{summary.payouts.processed_count} payouts</div>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card border-0 shadow-sm border-start border-4 border-info h-100">
                  <div className="card-body py-3">
                    <div className="fw-bold fs-3 text-info">ETB {Number(summary.balance).toLocaleString()}</div>
                    <div className="text-muted small">Current Balance</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && activeTab === 'contributions' && contributions && (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white fw-semibold">Per-Member Contribution Breakdown</div>
              {contributions.length === 0 ? (
                <div className="card-body text-center py-4 text-muted">No approved members.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Member</th>
                        <th>Verified Amount (ETB)</th>
                        <th>Verified Count</th>
                        <th>Pending Count</th>
                        <th>Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contributions.map((c, i) => (
                        <tr key={i}>
                          <td className="fw-semibold">{c.member_name}</td>
                          <td>{Number(c.total_verified).toLocaleString()}</td>
                          <td>{c.verified_count}</td>
                          <td>{c.pending_count}</td>
                          <td>{c.outstanding_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!loading && !error && activeTab === 'payouts' && payouts && (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white fw-semibold">Payout History</div>
              {payouts.length === 0 ? (
                <div className="card-body text-center py-4 text-muted">No payouts processed.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Reference</th>
                        <th>Recipient</th>
                        <th>Position</th>
                        <th>Amount (ETB)</th>
                        <th>Method</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.map((p, i) => (
                        <tr key={i}>
                          <td className="font-monospace small">{p.payout_reference}</td>
                          <td className="fw-semibold">{p.recipient}</td>
                          <td>#{p.position}</td>
                          <td>{Number(p.amount).toLocaleString()}</td>
                          <td className="text-muted small">{p.method}</td>
                          <td><StatusBadge status={p.status} /></td>
                          <td className="text-muted small">{p.processed_at ? new Date(p.processed_at).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!loading && !error && activeTab === 'memberships' && memberships && (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white fw-semibold">
                Membership Overview — {memberships.total} total
              </div>
              <div className="card-body">
                <div className="row g-2 mb-3">
                  {Object.entries(memberships.by_status).map(([status, count]) => (
                    <div className="col-6 col-md-3" key={status}>
                      <div className="d-flex align-items-center gap-2">
                        <StatusBadge status={status} />
                        <span className="fw-bold fs-5">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr><th>Member</th><th>Status</th><th>Rotation Position</th><th>Joined</th></tr>
                    </thead>
                    <tbody>
                      {memberships.members.map((m, i) => (
                        <tr key={i}>
                          <td className="fw-semibold">{m.member_name}</td>
                          <td><StatusBadge status={m.status} /></td>
                          <td>{m.rotation_position ?? '—'}</td>
                          <td className="text-muted small">{new Date(m.joined).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
