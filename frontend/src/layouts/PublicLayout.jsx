/**
 * PublicLayout — used for Login and Register pages.
 * Full-screen gradient background with a centred card.
 */
import React from 'react';
import { Outlet } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="auth-wrapper">
      <Outlet />
    </div>
  );
}
