/**
 * Auth API functions.
 * All calls go through the shared Axios instance with CSRF handling.
 */
import apiClient from './axios';

/**
 * Fetch a CSRF cookie then log the user in.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<object>} User profile data
 */
export async function login(username, password) {
  // Hit health-check first to ensure the csrftoken cookie is set
  await apiClient.get('/health/');
  const response = await apiClient.post('/auth/login/', { username, password });
  return response.data;
}

/**
 * Log the current user out and flush the server session.
 */
export async function logout() {
  const response = await apiClient.post('/auth/logout/');
  return response.data;
}

/**
 * Return the currently authenticated user's profile.
 * Returns null (not an error) when the user is not logged in.
 */
export async function getMe() {
  try {
    const response = await apiClient.get('/auth/me/');
    return response.data;
  } catch (error) {
    if (error.response?.status === 403 || error.response?.status === 401) {
      return null;
    }
    throw error;
  }
}

/**
 * Register a new user account.
 * @param {object} data  Registration form fields
 */
export async function register(data) {
  // Ensure we have a CSRF cookie before the POST
  await apiClient.get('/health/');
  const response = await apiClient.post('/auth/register/', data);
  return response.data;
}

/**
 * Update the authenticated user's own profile (name, phone).
 * @param {object} data  Partial profile fields
 */
export async function updateProfile(data) {
  const response = await apiClient.patch('/auth/me/', data);
  return response.data;
}

/**
 * Change the authenticated user's password.
 * @param {object} data  { old_password, new_password, new_password_confirm }
 */
export async function changePassword(data) {
  const response = await apiClient.post('/auth/change-password/', data);
  return response.data;
}

/**
 * List all users. Administrator only.
 */
export async function listUsers() {
  const response = await apiClient.get('/auth/users/');
  return response.data;
}

/**
 * Update a user's role or active status. Administrator only.
 * @param {number} userId
 * @param {object} data  { role?, is_active? }
 */
export async function updateUser(userId, data) {
  const response = await apiClient.patch(`/auth/users/${userId}/`, data);
  return response.data;
}
