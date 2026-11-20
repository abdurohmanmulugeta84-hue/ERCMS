/**
 * AuthContext — global authentication state.
 *
 * Provides:
 *   user         — the current user object (or null if unauthenticated)
 *   isLoading    — true while the initial /me check is in progress
 *   login()      — post credentials, update state
 *   logout()     — end session, clear state
 *   refreshUser()— re-fetch /me (useful after profile updates)
 */
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, logout as apiLogout, getMe } from '../api/authApi';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // starts true — checking session

  // On mount, check if a session cookie already exists
  useEffect(() => {
    getMe()
      .then((userData) => setUser(userData))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  /**
   * Log in with username + password.
   * Returns the user object on success.
   * Throws the Axios error on failure (let the login page handle it).
   */
  const login = useCallback(async (username, password) => {
    const userData = await apiLogin(username, password);
    setUser(userData);
    return userData;
  }, []);

  /**
   * Log the current user out.
   * Clears client-side state regardless of whether the API call succeeds,
   * so the UI always returns to the login screen.
   */
  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
    }
  }, []);

  /**
   * Re-fetch the user profile — call this after a profile update.
   */
  const refreshUser = useCallback(async () => {
    const userData = await getMe();
    setUser(userData);
    return userData;
  }, []);

  const value = { user, isLoading, login, logout, refreshUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
