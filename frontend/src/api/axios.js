/**
 * Configured Axios instance for the ERCMS API.
 *
 * - Base URL: /api  (proxied to Django by Vite in dev; same origin in prod)
 * - Credentials: true  — sends the session cookie on every request
 * - CSRF: reads the csrftoken cookie and attaches it as X-CSRFToken header
 *   on every mutating request (POST, PUT, PATCH, DELETE)
 */
import axios from 'axios';

/** Read a cookie by name. Returns null if not found. */
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,          // send session cookie cross-origin in dev
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Attach the CSRF token before every mutating request
apiClient.interceptors.request.use((config) => {
  const mutatingMethods = ['post', 'put', 'patch', 'delete'];
  if (mutatingMethods.includes(config.method?.toLowerCase())) {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
  }
  return config;
});

// Global response error handler:
// - 401 / 403 are handled by individual components or the AuthContext.
// - Other errors are passed through as-is so callers can inspect them.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default apiClient;
