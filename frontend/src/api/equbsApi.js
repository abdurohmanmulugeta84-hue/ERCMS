import apiClient from './axios';

export const listEqubs      = ()         => apiClient.get('/equbs/').then(r => r.data);
export const getMyEqubs     = ()         => apiClient.get('/equbs/my/').then(r => r.data);
export const getEqub        = (id)       => apiClient.get(`/equbs/${id}/`).then(r => r.data);
export const createEqub     = (data)     => apiClient.post('/equbs/', data).then(r => r.data);
export const updateEqub     = (id, data) => apiClient.patch(`/equbs/${id}/`, data).then(r => r.data);
export const updateEqubStatus = (id, s)  => apiClient.patch(`/equbs/${id}/status/`, { status: s }).then(r => r.data);
