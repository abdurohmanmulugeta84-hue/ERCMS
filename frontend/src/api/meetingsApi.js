import apiClient from './axios';

export const listMeetings      = (params)        => apiClient.get('/meetings/', { params }).then(r => r.data);
export const getMeeting        = (id)            => apiClient.get(`/meetings/${id}/`).then(r => r.data);
export const createMeeting     = (data)          => apiClient.post('/meetings/', data).then(r => r.data);
export const updateMeeting     = (id, data)      => apiClient.patch(`/meetings/${id}/`, data).then(r => r.data);
export const recordAttendance  = (meetId, data)  => apiClient.post(`/meetings/${meetId}/attendance/`, data).then(r => r.data);
export const bulkAttendance    = (meetId, data)  => apiClient.post(`/meetings/${meetId}/attendance/bulk/`, data).then(r => r.data);
export const updateAttendance  = (meetId, aid, data) => apiClient.patch(`/meetings/${meetId}/attendance/${aid}/`, data).then(r => r.data);
