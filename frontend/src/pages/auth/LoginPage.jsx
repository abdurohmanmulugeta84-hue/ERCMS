/**
 * LoginPage — session-based login form.
 *
 * On success the user is redirected to the page they were trying to reach,
 * or to /dashboard as a fallback.
 */
import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import ErrorMessage from '../../components/common/ErrorMessage';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const from = location.state?.from?.pathname ?? '/dashboard';

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password) {
      setError('Please enter your username and password.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await login(form.username.trim(), form.password);
      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        'Login failed. Please check your credentials and try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-card">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="auth-logo">
          <i className="bi bi-coin" aria-hidden="true" />
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to ERCMS</p>
      </div>

      {/* Error */}
      <ErrorMessage error={error} onDismiss={() => setError(null)} />

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate>
        {/* Username */}
        <div className="mb-3">
          <label htmlFor="username" className="form-label fw-semibold">
            Username
          </label>
          <div className="input-group">
            <span className="input-group-text" aria-hidden="true">
              <i className="bi bi-person" />
            </span>
            <input
              id="username"
              name="username"
              type="text"
              className="form-control"
              autoComplete="username"
              autoFocus
              required
              value={form.username}
              onChange={handleChange}
              placeholder="Enter your username"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Password */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <label htmlFor="password" className="form-label fw-semibold">
              Password
            </label>
          </div>
          <div className="input-group">
            <span className="input-group-text" aria-hidden="true">
              <i className="bi bi-lock" />
            </span>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              className="form-control"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
              disabled={isLoading}
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn btn-ercms-primary w-100 fw-semibold py-2"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
              Signing in…
            </>
          ) : 'Sign In'}
        </button>
      </form>

      {/* Register link */}
      <hr className="my-4" />
      <p className="text-center text-muted mb-0" style={{ fontSize: '0.875rem' }}>
        Don&apos;t have an account?{' '}
        <Link to="/register" className="fw-semibold text-decoration-none" style={{ color: 'var(--ercms-primary)' }}>
          Register here
        </Link>
      </p>
    </div>
  );
}
