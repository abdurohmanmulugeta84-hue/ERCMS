/**
 * ProfilePage — allows users to view and update their own profile
 * and change their password.
 */
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { updateProfile, changePassword } from '../api/authApi';
import ErrorMessage from '../components/common/ErrorMessage';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name ?? '',
    last_name:  user?.last_name  ?? '',
    phone:      user?.phone      ?? '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError,  setProfileError]  = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password form state
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', new_password_confirm: '' });
  const [pwSaving,  setPwSaving]  = useState(false);
  const [pwError,   setPwError]   = useState(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const ROLE_LABELS = { admin: 'System Administrator', organizer: 'Equb Organizer', treasurer: 'Treasurer', member: 'Equb Member', auditor: 'Auditor' };

  const handleProfileChange = (e) => {
    setProfileForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setProfileError(null);
    setProfileSuccess(false);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError(null);
    try {
      await updateProfile(profileForm);
      await refreshUser();
      setProfileSuccess(true);
    } catch (err) {
      setProfileError(err?.response?.data ?? 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePwChange = (e) => {
    setPwForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setPwError(null);
    setPwSuccess(false);
  };

  const handlePwSubmit = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.new_password_confirm) {
      setPwError('New passwords do not match.');
      return;
    }
    setPwSaving(true);
    setPwError(null);
    try {
      await changePassword(pwForm);
      setPwSuccess(true);
      setPwForm({ old_password: '', new_password: '', new_password_confirm: '' });
    } catch (err) {
      setPwError(err?.response?.data ?? 'Failed to change password.');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div>
      <div className="ercms-page-header">
        <h1>My Profile</h1>
        <p className="text-muted mb-0">Update your personal information and password.</p>
      </div>

      <div className="row g-4">
        {/* Profile info */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">
              <i className="bi bi-person me-2" aria-hidden="true" />
              Personal Information
            </div>
            <div className="card-body">
              {/* Read-only fields */}
              <div className="mb-3">
                <label className="form-label text-muted small">Username</label>
                <input className="form-control bg-light" value={user?.username ?? ''} readOnly aria-readonly="true" />
              </div>
              <div className="mb-3">
                <label className="form-label text-muted small">Email Address</label>
                <input className="form-control bg-light" value={user?.email ?? ''} readOnly aria-readonly="true" />
              </div>
              <div className="mb-3">
                <label className="form-label text-muted small">Role</label>
                <input className="form-control bg-light" value={ROLE_LABELS[user?.role] ?? user?.role ?? ''} readOnly aria-readonly="true" />
              </div>
              <hr />

              <ErrorMessage error={profileError} onDismiss={() => setProfileError(null)} />
              {profileSuccess && (
                <div className="alert alert-success py-2" role="status">Profile updated successfully.</div>
              )}

              <form onSubmit={handleProfileSubmit}>
                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label htmlFor="first_name" className="form-label fw-semibold">First Name</label>
                    <input id="first_name" name="first_name" type="text" className="form-control"
                      value={profileForm.first_name} onChange={handleProfileChange} disabled={profileSaving} required />
                  </div>
                  <div className="col-6">
                    <label htmlFor="last_name" className="form-label fw-semibold">Last Name</label>
                    <input id="last_name" name="last_name" type="text" className="form-control"
                      value={profileForm.last_name} onChange={handleProfileChange} disabled={profileSaving} required />
                  </div>
                </div>
                <div className="mb-3">
                  <label htmlFor="phone" className="form-label fw-semibold">Phone</label>
                  <input id="phone" name="phone" type="tel" className="form-control"
                    value={profileForm.phone} onChange={handleProfileChange} disabled={profileSaving}
                    placeholder="09XXXXXXXX" />
                </div>
                <button type="submit" className="btn btn-ercms-primary" disabled={profileSaving}>
                  {profileSaving ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Saving…</> : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Change password */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">
              <i className="bi bi-lock me-2" aria-hidden="true" />
              Change Password
            </div>
            <div className="card-body">
              <ErrorMessage error={pwError} onDismiss={() => setPwError(null)} />
              {pwSuccess && (
                <div className="alert alert-success py-2" role="status">Password changed successfully.</div>
              )}
              <form onSubmit={handlePwSubmit}>
                <div className="mb-3">
                  <label htmlFor="old_password" className="form-label fw-semibold">Current Password</label>
                  <input id="old_password" name="old_password" type="password" className="form-control"
                    value={pwForm.old_password} onChange={handlePwChange} disabled={pwSaving} required autoComplete="current-password" />
                </div>
                <div className="mb-3">
                  <label htmlFor="new_password" className="form-label fw-semibold">New Password</label>
                  <input id="new_password" name="new_password" type="password" className="form-control"
                    value={pwForm.new_password} onChange={handlePwChange} disabled={pwSaving} required autoComplete="new-password" />
                </div>
                <div className="mb-4">
                  <label htmlFor="new_password_confirm" className="form-label fw-semibold">Confirm New Password</label>
                  <input id="new_password_confirm" name="new_password_confirm" type="password" className="form-control"
                    value={pwForm.new_password_confirm} onChange={handlePwChange} disabled={pwSaving} required autoComplete="new-password" />
                </div>
                <button type="submit" className="btn btn-outline-danger" disabled={pwSaving}>
                  {pwSaving ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Changing…</> : 'Change Password'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
