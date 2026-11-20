import apiClient from './axios';

export const listPayouts   = (params)   => apiClient.get('/payouts/', { params }).then(r => r.data);
export const getMyPayouts  = ()         => apiClient.get('/payouts/my/').then(r => r.data);
export const getPayout     = (id)       => apiClient.get(`/payouts/${id}/`).then(r => r.data);
export const processPayout = (data)     => apiClient.post('/payouts/', data).then(r => r.data);
export const cancelPayout  = (id, data) => apiClient.post(`/payouts/${id}/cancel/`, data).then(r => r.data);
