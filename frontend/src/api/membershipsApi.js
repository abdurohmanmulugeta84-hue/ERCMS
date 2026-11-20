import apiClient from './axios';

export const listMemberships   = (params) => apiClient.get('/memberships/', { params }).then(r => r.data);
export const getMyMemberships  = ()       => apiClient.get('/memberships/my/').then(r => r.data);
export const getMembership     = (id)     => apiClient.get(`/memberships/${id}/`).then(r => r.data);
export const requestMembership = (data)   => apiClient.post('/memberships/', data).then(r => r.data);
export const reviewMembership  = (id, data) => apiClient.post(`/memberships/${id}/review/`, data).then(r => r.data);
export const updateMembershipStatus = (id, data) => apiClient.patch(`/memberships/${id}/status/`, data).then(r => r.data);
