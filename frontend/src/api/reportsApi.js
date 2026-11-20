import apiClient from './axios';

export const getFinancialSummary = (equbId) => apiClient.get('/reports/financial-summary/', { params: { equb: equbId } }).then(r => r.data);
export const getContributionReport = (equbId) => apiClient.get('/reports/contributions/', { params: { equb: equbId } }).then(r => r.data);
export const getPayoutReport = (equbId) => apiClient.get('/reports/payouts/', { params: { equb: equbId } }).then(r => r.data);
export const getMembershipReport = (equbId) => apiClient.get('/reports/memberships/', { params: { equb: equbId } }).then(r => r.data);
export const getSystemOverview = () => apiClient.get('/reports/system-overview/').then(r => r.data);
