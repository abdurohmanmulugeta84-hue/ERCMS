import apiClient from './axios';

export const listSchedules       = (params)      => apiClient.get('/rotations/', { params }).then(r => r.data);
export const getSchedule         = (id)          => apiClient.get(`/rotations/${id}/`).then(r => r.data);
export const createSchedule      = (data)        => apiClient.post('/rotations/', data).then(r => r.data);
export const updateSchedule      = (id, data)    => apiClient.patch(`/rotations/${id}/`, data).then(r => r.data);
export const addEntry            = (schedId, data) => apiClient.post(`/rotations/${schedId}/entries/`, data).then(r => r.data);
export const updateEntry         = (schedId, eid, data) => apiClient.patch(`/rotations/${schedId}/entries/${eid}/`, data).then(r => r.data);
export const deleteEntry         = (schedId, eid) => apiClient.delete(`/rotations/${schedId}/entries/${eid}/`);
export const getMyRotationEntries = ()           => apiClient.get('/rotations/my/').then(r => r.data);
