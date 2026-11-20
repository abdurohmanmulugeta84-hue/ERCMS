import apiClient from './axios';

// Contributions
export const listContributions    = (params) => apiClient.get('/contributions/', { params }).then(r => r.data);
export const getContribution      = (id)     => apiClient.get(`/contributions/${id}/`).then(r => r.data);
export const submitContribution   = (data)   => apiClient.post('/contributions/', data).then(r => r.data);
export const verifyContribution   = (id, data) => apiClient.post(`/contributions/${id}/verify/`, data).then(r => r.data);
export const getOutstanding       = (params) => apiClient.get('/contributions/outstanding/', { params }).then(r => r.data);

// Payments
export const listPayments         = (params) => apiClient.get('/contributions/payments/', { params }).then(r => r.data);
export const recordPayment        = (data)   => apiClient.post('/contributions/payments/', data).then(r => r.data);
export const getPayment           = (id)     => apiClient.get(`/contributions/payments/${id}/`).then(r => r.data);
