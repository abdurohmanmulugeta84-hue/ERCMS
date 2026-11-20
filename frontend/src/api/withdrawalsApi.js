import apiClient from './axios';

export const listWithdrawals    = (params)   => apiClient.get('/withdrawals/', { params }).then(r => r.data);
export const getWithdrawal      = (id)       => apiClient.get(`/withdrawals/${id}/`).then(r => r.data);
export const requestWithdrawal  = (data)     => apiClient.post('/withdrawals/', data).then(r => r.data);
export const reviewWithdrawal   = (id, data) => apiClient.post(`/withdrawals/${id}/review/`, data).then(r => r.data);
