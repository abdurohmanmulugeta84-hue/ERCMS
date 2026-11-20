import apiClient from './axios';

export const listNotifications  = (params)  => apiClient.get('/notifications/', { params }).then(r => r.data);
export const markRead           = (id)      => apiClient.post(`/notifications/${id}/read/`).then(r => r.data);
export const markAllRead        = ()        => apiClient.post('/notifications/read-all/').then(r => r.data);
export const getUnreadCount     = ()        => apiClient.get('/notifications/unread-count/').then(r => r.data);
