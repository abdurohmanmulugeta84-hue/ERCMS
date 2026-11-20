/**
 * LogoDisplay — renders the site logo in three modes:
 *   1. Uploaded image  (settings.logo_image_url is set)
 *   2. Emoji           (settings.logo_emoji is non-empty)
 *   3. Bootstrap icon  (fallback to settings.logo_icon)
 *
 * Usage:
 *   <LogoDisplay settings={settings} size={36} />
 */
import React from 'react';

export default function LogoDisplay({ settings, size = 36, className = '' }) {
  const style = { width: size, height: size, fontSize: size * 0.55 };

  if (settings?.logo_image_url) {
    return (
      <img
        src={settings.logo_image_url}
        alt={settings?.site_name || 'Logo'}
        className={className}
        style={{ ...style, objectFit: 'contain', borderRadius: 6 }}
      />
    );
  }

  if (settings?.logo_emoji) {
    return (
      <span className={className} style={{ ...style, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {settings.logo_emoji}
      </span>
    );
  }

  return (
    <i
      className={`bi ${settings?.logo_icon || 'bi-coin'} ${className}`}
      style={{ fontSize: style.fontSize }}
      aria-hidden="true"
    />
  );
}
