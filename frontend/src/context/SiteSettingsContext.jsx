/**
 * SiteSettingsContext — loads admin-editable site settings on app start.
 *
 * Provides `settings` to all components so the homepage, navbar, footer,
 * and sidebar can show dynamic content (site name, logo, colors, hero text,
 * watermarks) instead of hardcoded values.
 *
 * The endpoint is public (no auth required) so the landing page can render
 * before login.
 */
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getSiteSettings } from '../api/settingsApi';

export const SiteSettingsContext = createContext(null);

const DEFAULT_SETTINGS = {
  site_name: "ERCMS",
  logo_image_url: null,
  logo_emoji: "🪙",
  logo_icon: "bi-coin",
  hero_title: "Equb Management,<br />Modernized.",
  hero_subtitle: "A centralized platform for managing traditional Ethiopian Equb savings groups — track contributions, automate rotations, process payouts, and maintain complete financial transparency.",
  cta_primary_text: "Get Started",
  cta_secondary_text: "Login",
  watermark_1: "Equb Rotation",
  watermark_2: "From Paper to Digital",
  watermark_3: "The Rotation Cycle",
  footer_text: "Kombolcha Institute of Technology · Department of Software Engineering · 2026",
  primary_color: "#1a6b3a",
  primary_dark_color: "#134d2b",
  accent_color: "#f4a81d",
  svg_cycle_seconds: 5,
};

export function SiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    getSiteSettings()
      .then(data => setSettings({ ...DEFAULT_SETTINGS, ...data }))
      .catch(() => setSettings(DEFAULT_SETTINGS));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await getSiteSettings();
      setSettings({ ...DEFAULT_SETTINGS, ...data });
    } catch { /* keep current */ }
  }, []);

  return (
    <SiteSettingsContext.Provider value={{ settings, refresh }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}
