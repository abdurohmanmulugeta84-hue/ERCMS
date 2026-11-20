import { useContext } from 'react';
import { SiteSettingsContext } from '../context/SiteSettingsContext';

export function useSiteSettings() {
  const ctx = useContext(SiteSettingsContext);
  if (!ctx) return { settings: null, refresh: () => {} };
  return ctx;
}
