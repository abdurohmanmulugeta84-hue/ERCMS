/**
 * RegisterPage — new account registration.
 *
 * - Member accounts are activated immediately.
 * - Organizer / Treasurer / Auditor accounts start inactive and show a
 *   "pending approval" message so the user knows to wait.
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../../api/authApi';
import ErrorMessage from '../../components/common/ErrorMessage';

const ROLES = [
  { value: 'member',    label: 'Equb Member' },
  { value: 'organizer', label: 'Equb Organizer' },
  { value: 'treasurer', label: 'Treasurer' },
  { value: 'auditor',   label: 'Auditor' },
];

const INITIAL_FORM = {
  first_name: '',
  last_name: '',
  username: '',
  email: '',
  phone: '',
  role: 'member',
  password: '',
  password_confirm: '',
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.password_confirm) {
      setError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await register(form);
      setSuccess(result.detail);
    } catch (err) {
      setError(err?.response?.data ?? 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    const isPending = success.toLowerCase().includes('approval');
    return (
      <div className="auth-card text-center">
        <div className="mb-3">
          <i
            className={`bi ${isPending ? 'bi-hourglass-split text-warning' : 'bi-check-circle-fill text-success'}`}
            style={{ fontSize: '3rem' }}
            aria-hidden="true"
          />
        </div>
        <h2 className="auth-title">
          {isPending ? 'Account Submitted' : 'Account Created!'}
        </h2>
        <p className="text-muted mt-2">{success}</p>
        {!isPending && (
          <button
            className="btn btn-ercms-primary mt-3 px-4"
            onClick={() => navigate('/login')}
          >
            Go to Login
          </button>
        )}
        {isPending && (
          <p className="text-muted small mt-3">
            You will be able to log in once an Administrator activates your account.
          </p>
        )}
      </div>
    );
  }

  // ── Registration form ─────────────────────────────────────────────────────
  return (
    <div className="auth-card" style={{ maxWidth: 520 }}>
      {/* Header */}
      <div className="text-center mb-4">
        <div className="auth-logo">
          <i className="bi bi-coin" aria-hidden="true" />
        </div>
        <h1 className="auth-title">Create an Account</h1>
        <p className="auth-subtitle">Join the Equb Management System</p>
      </div>

      <ErrorMessage error={error} onDismiss={() => setError(null)} />

      <form onSubmit={handleSubmit} noValidate>
        {/* Name row */}
        <div className="row g-3 mb-3">
          <div className="col-6">
            <label htmlFor="first_name" className="form-label fw-semibold">First Name</label>
            <input
              id="first_name" name="first_name" type="text"
              className="form-control" required autoFocus
              value={form.first_name} onChange={handleChange}
              placeholder="Abebe" disabled={isLoading}
            />
          </div>
          <div className="col-6">
            <label htmlFor="last_name" className="form-label fw-semibold">Last Name</label>
            <input
              id="last_name" name="last_name" type="text"
              className="form-control" required
              value={form.last_name} onChange={handleChange}
              placeholder="Kebede" disabled={isLoading}
            />
          </div>
        </div>

        {/* Username */}
        <div className="mb-3">
          <label htmlFor="reg_username" className="form-label fw-semibold">Username</label>
          <input
            id="reg_username" name="username" type="text"
            className="form-control" required autoComplete="username"
            value={form.username} onChange={handleChange}
            placeholder="Choose a username" disabled={isLoading}
          />
        </div>

        {/* Email */}
        <div className="mb-3">
          <label htmlFor="email" className="form-label fw-semibold">Email Address</label>
          <input
            id="email" name="email" type="email"
            className="form-control" required autoComplete="email"
            value={form.email} onChange={handleChange}
            placeholder="you@example.com" disabled={isLoading}
          />
        </div>

        {/* Phone (optional) */}
        <div className="mb-3">
          <label htmlFor="phone" className="form-label fw-semibold">
            Phone <span className="text-muted fw-normal">(optional)</span>
          </label>
          <input
            id="phone" name="phone" type="tel"
            className="form-control"
            value={form.phone} onChange={handleChange}
            placeholder="09XXXXXXXX" disabled={isLoading}
          />
        </div>

        {/* Role */}
        <div className="mb-3">
          <label htmlFor="role" className="form-label fw-semibold">Role</label>
          <select
            id="role" name="role"
            className="form-select"
            value={form.role} onChange={handleChange}
            disabled={isLoading}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          {form.role !== 'member' && (
            <div className="form-text text-warning">
              <i className="bi bi-info-circle me-1" aria-hidden="true" />
              This role requires Administrator approval before you can log in.
            </div>
          )}
        </div>

        {/* Password */}
        <div className="mb-3">
          <label htmlFor="reg_password" className="form-label fw-semibold">Password</label>
          <div className="input-group">
            <input
              id="reg_password" name="password"
              type={showPassword ? 'text' : 'password'}
              className="form-control" required autoComplete="new-password"
              value={form.password} onChange={handleChange}
              placeholder="Minimum 8 characters" disabled={isLoading}
            />
            <button
              type="button" className="btn btn-outline-secondary"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="mb-4">
          <label htmlFor="password_confirm" className="form-label fw-semibold">Confirm Password</label>
          <input
            id="password_confirm" name="password_confirm"
            type={showPassword ? 'text' : 'password'}
            className="form-control" required autoComplete="new-password"
            value={form.password_confirm} onChange={handleChange}
            placeholder="Repeat password" disabled={isLoading}
          />
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
              Creating account…
            </>
          ) : 'Create Account'}
        </button>
      </form>

      <hr className="my-4" />
      <p className="text-center text-muted mb-0" style={{ fontSize: '0.875rem' }}>
        Already have an account?{' '}
        <Link to="/login" className="fw-semibold text-decoration-none" style={{ color: 'var(--ercms-primary)' }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
