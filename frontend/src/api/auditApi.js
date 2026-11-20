import apiClient from './axios';

export const listAuditLogs = (params) => apiClient.get('/audit-log/', { params }).then(r => r.data);
