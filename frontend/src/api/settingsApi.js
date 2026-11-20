import apiClient from './axios';

export const getSiteSettings    = ()     => apiClient.get('/reports/site-settings/').then(r => r.data);
export const updateSiteSettings = (data) => apiClient.patch('/reports/site-settings/', data).then(r => r.data);

export const uploadSiteLogo = (file) => {
  const formData = new FormData();
  formData.append('logo', file);
  return apiClient.post('/reports/site-settings/logo/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};

export const removeSiteLogo = () =>
  apiClient.delete('/reports/site-settings/logo/').then(r => r.data);
