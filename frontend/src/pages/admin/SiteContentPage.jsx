/**
 * SiteContentPage — Admin only.
 *
 * Lets the administrator customize the public landing page:
 *   - Logo (upload image from filesystem, OR choose emoji/icon as fallback)
 *   - Hero title, subtitle, CTA button labels
 *   - SVG watermark text for each of the 3 cycling animations
 *   - Color theme (primary, dark, accent)
 *   - SVG cycle interval
 *   - Footer text
 *
 * A live preview panel shows how the logo and colors will look.
 * Logo uploads via POST /api/reports/site-settings/logo/ (multipart).
 * Text/color settings save via PATCH /api/reports/site-settings/.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { updateSiteSettings, uploadSiteLogo, removeSiteLogo } from '../../api/settingsApi';
import ErrorMessage from '../../components/common/ErrorMessage';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import LogoDisplay from '../../components/common/LogoDisplay';

// Common Bootstrap Icons for the logo picker
const LOGO_ICONS = [
  'bi-coin', 'bi-bank', 'bi-piggy-bank', 'bi-wallet2',
  'bi-currency-dollar', 'bi-gem', 'bi-star', 'bi-shield',
  'bi-collection', 'bi-people', 'bi-graph-up', 'bi-award',
];

function ColorField({ label, name, value, onChange }) {
  return (
    <div className="mb-3">
      <label className="form-label fw-semibold">{label}</label>
      <div className="d-flex align-items-center gap-2">
        <input type="color" className="form-control form-control-color" style={{ width: 50, height: 38 }}
          name={name} value={value} onChange={onChange} title={label} />
        <input type="text" className="form-control font-monospace" style={{ maxWidth: 120 }}
          name={name} value={value} onChange={onChange} placeholder="#rrggbb" />
        <div className="rounded px-3 py-1 text-white small fw-bold"
          style={{ background: value, border: '1px solid rgba(0,0,0,0.15)' }}>
          Sample
        </div>
      </div>
    </div>
  );
}

export default function SiteContentPage() {
  const { settings, refresh } = useSiteSettings();
  const [form, setForm]       = useState(null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('branding');

  // Logo upload state
  const fileInputRef           = useRef(null);
  const [logoPreview, setLogoPreview]   = useState(null); // local preview URL
  const [logoFile, setLogoFile]         = useState(null); // File object
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError]       = useState(null);
  const [logoSuccess, setLogoSuccess]   = useState(false);
  const [logoRemoving, setLogoRemoving] = useState(false);

  // Initialise form from settings when they load
  useEffect(() => {
    if (settings) setForm({ ...settings });
  }, [settings]);

  if (!form) return <LoadingSpinner message="Loading settings…" />;

  const set = (e) => {
    const { name, value, type } = e.target;
    setForm(p => ({ ...p, [name]: type === 'number' ? Number(value) : value }));
    setError(null);
    setSuccess(false);
  };

  // ── Logo file selection ──────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);
    setLogoSuccess(false);

    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setLogoError('Unsupported file type. Please use PNG, JPG, SVG, GIF, or WebP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('File too large. Maximum size is 2 MB.');
      return;
    }

    setLogoFile(file);
    // Create a local object URL for the preview
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setLogoUploading(true);
    setLogoError(null);
    setLogoSuccess(false);
    try {
      await uploadSiteLogo(logoFile);
      await refresh();
      setLogoSuccess(true);
      setLogoFile(null);
      setLogoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setLogoError(err?.response?.data?.detail || 'Upload failed.');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoRemove = async () => {
    setLogoRemoving(true);
    setLogoError(null);
    try {
      await removeSiteLogo();
      await refresh();
      setLogoPreview(null);
      setLogoFile(null);
    } catch (err) {
      setLogoError('Failed to remove logo.');
    } finally {
      setLogoRemoving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await updateSiteSettings(form);
      await refresh(); // update context so changes reflect immediately everywhere
      setSuccess(true);
    } catch (err) {
      setError(err?.response?.data || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (settings) setForm({ ...settings });
    setError(null);
    setSuccess(false);
  };

  const TABS = [
    { key: 'branding',  label: 'Logo & Branding',   icon: 'bi-pentagon' },
    { key: 'hero',      label: 'Hero Section',       icon: 'bi-layout-text-window' },
    { key: 'colors',    label: 'Colors',             icon: 'bi-palette' },
    { key: 'advanced',  label: 'Advanced',           icon: 'bi-sliders' },
  ];

  return (
    <div>
      <div className="ercms-page-header d-flex justify-content-between align-items-start flex-wrap gap-2">
        <div>
          <h1>Site Content Settings</h1>
          <p className="text-muted mb-0">Customize the public landing page, logo, colors, and text.</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={handleReset} disabled={saving}>
            <i className="bi bi-arrow-counterclockwise me-1" />Reset
          </button>
          <button className="btn btn-ercms-primary" onClick={handleSave} disabled={saving}>
            {saving
              ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</>
              : <><i className="bi bi-check-circle me-1" />Save Changes</>}
          </button>
        </div>
      </div>

      {error   && <ErrorMessage error={error} onDismiss={() => setError(null)} />}
      {success && <div className="alert alert-success py-2 d-flex align-items-center gap-2" role="status">
        <i className="bi bi-check-circle-fill" />Settings saved — changes are live on the homepage now.
      </div>}

      <div className="row g-3">
        {/* ── Editor panel ── */}
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm">
            {/* Tabs */}
            <div className="card-header bg-white p-0">
              <ul className="nav nav-tabs border-0 px-3" role="tablist">
                {TABS.map(t => (
                  <li className="nav-item" key={t.key} role="presentation">
                    <button className={`nav-link ${activeTab === t.key ? 'active' : ''}`}
                      onClick={() => setActiveTab(t.key)} role="tab">
                      <i className={`bi ${t.icon} me-1`} aria-hidden="true" />{t.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card-body p-4">

              {/* ── Logo & Branding ── */}
              {activeTab === 'branding' && (
                <div>
                  {/* ── Logo Upload ── */}
                  <div className="mb-4 p-4 rounded-3" style={{ background: '#f5f7fa', border: '1px dashed #dee2e6' }}>
                    <h6 className="fw-bold mb-1">Logo Image</h6>
                    <p className="text-muted small mb-3">
                      Upload an image from your filesystem (PNG, JPG, SVG, GIF, WebP — max 2 MB).
                      This overrides the emoji/icon fallback below.
                    </p>

                    {/* Current logo display */}
                    <div className="d-flex align-items-center gap-4 mb-3 flex-wrap">
                      <div>
                        <p className="text-muted small mb-1">Current Logo</p>
                        <div className="d-flex align-items-center gap-2 p-3 rounded-3"
                          style={{ background: form.primary_color, display: 'inline-flex' }}>
                          <LogoDisplay settings={settings} size={40} />
                          <span className="text-white fw-bold ms-1">{form.site_name}</span>
                        </div>
                      </div>
                      {(logoPreview || settings?.logo_image_url) && (
                        <div>
                          <p className="text-muted small mb-1">
                            {logoPreview ? 'Selected (not saved yet)' : 'Uploaded image'}
                          </p>
                          <img
                            src={logoPreview || settings.logo_image_url}
                            alt="Logo preview"
                            style={{
                              maxHeight: 60, maxWidth: 160,
                              objectFit: 'contain', border: '1px solid #dee2e6',
                              borderRadius: 8, padding: 4, background: '#fff',
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* File input + upload button */}
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                        className="form-control"
                        style={{ maxWidth: 320 }}
                        onChange={handleFileChange}
                        aria-label="Choose logo image file"
                      />
                      {logoFile && (
                        <button className="btn btn-ercms-primary" onClick={handleLogoUpload}
                          disabled={logoUploading}>
                          {logoUploading
                            ? <><span className="spinner-border spinner-border-sm me-2" />Uploading…</>
                            : <><i className="bi bi-cloud-upload me-1" />Upload Logo</>}
                        </button>
                      )}
                      {settings?.logo_image_url && !logoFile && (
                        <button className="btn btn-outline-danger btn-sm" onClick={handleLogoRemove}
                          disabled={logoRemoving} title="Remove uploaded logo">
                          {logoRemoving
                            ? <span className="spinner-border spinner-border-sm" />
                            : <><i className="bi bi-trash me-1" />Remove</>}
                        </button>
                      )}
                    </div>

                    {logoError   && <div className="alert alert-danger py-2 mt-2 mb-0 small">{logoError}</div>}
                    {logoSuccess && <div className="alert alert-success py-2 mt-2 mb-0 small"><i className="bi bi-check-circle me-1" />Logo uploaded and live.</div>}
                  </div>

                  {/* ── Fallback: Emoji ── */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Logo Emoji <span className="text-muted fw-normal small">(used when no image is uploaded)</span>
                    </label>
                    <input name="logo_emoji" type="text" className="form-control" style={{ maxWidth: 120, fontSize: '1.5rem' }}
                      value={form.logo_emoji} onChange={set} placeholder="🪙" />
                    <div className="form-text">A single emoji. Leave blank to use the Bootstrap icon below.</div>
                  </div>

                  {/* ── Fallback: Icon ── */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Logo Bootstrap Icon <span className="text-muted fw-normal small">(used when no image or emoji)</span>
                    </label>
                    <div className="d-flex flex-wrap gap-2 mb-2">
                      {LOGO_ICONS.map(icon => (
                        <button key={icon} type="button"
                          className={`btn btn-sm ${form.logo_icon === icon ? 'btn-ercms-primary' : 'btn-outline-secondary'}`}
                          onClick={() => setForm(p => ({ ...p, logo_icon: icon, logo_emoji: '' }))}
                          title={icon} aria-label={icon}>
                          <i className={`bi ${icon}`} style={{ fontSize: '1.1rem' }} />
                        </button>
                      ))}
                    </div>
                    <input name="logo_icon" type="text" className="form-control font-monospace" style={{ maxWidth: 200 }}
                      value={form.logo_icon} onChange={set} placeholder="bi-coin" />
                  </div>

                  <hr />

                  {/* ── Site name & footer ── */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Site Name</label>
                    <input name="site_name" type="text" className="form-control"
                      value={form.site_name} onChange={set} placeholder="ERCMS" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Footer Text</label>
                    <input name="footer_text" type="text" className="form-control"
                      value={form.footer_text} onChange={set} />
                  </div>
                </div>
              )}

              {/* ── Hero Section ── */}
              {activeTab === 'hero' && (
                <div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Hero Title</label>
                    <input name="hero_title" type="text" className="form-control"
                      value={form.hero_title} onChange={set}
                      placeholder="Equb Management,<br />Modernized." />
                    <div className="form-text">You can use <code>&lt;br /&gt;</code> for a line break.</div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Hero Subtitle</label>
                    <textarea name="hero_subtitle" className="form-control" rows={3}
                      value={form.hero_subtitle} onChange={set} />
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Primary CTA Button</label>
                      <input name="cta_primary_text" type="text" className="form-control"
                        value={form.cta_primary_text} onChange={set} placeholder="Get Started" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Secondary CTA Button</label>
                      <input name="cta_secondary_text" type="text" className="form-control"
                        value={form.cta_secondary_text} onChange={set} placeholder="Login" />
                    </div>
                  </div>

                  <hr />
                  <p className="fw-semibold mb-2">SVG Watermark Labels</p>
                  <p className="text-muted small mb-3">
                    These faded labels appear behind each cycling animation in the hero section.
                  </p>
                  {[
                    { name: 'watermark_1', label: 'First SVG (Equb Rotation)' },
                    { name: 'watermark_2', label: 'Second SVG (Transformation)' },
                    { name: 'watermark_3', label: 'Third SVG (Lifecycle Cycle)' },
                  ].map(w => (
                    <div className="mb-3" key={w.name}>
                      <label className="form-label fw-semibold">{w.label}</label>
                      <input name={w.name} type="text" className="form-control"
                        value={form[w.name]} onChange={set} />
                    </div>
                  ))}
                </div>
              )}

              {/* ── Colors ── */}
              {activeTab === 'colors' && (
                <div>
                  <p className="text-muted small mb-4">
                    Changes apply to the sidebar, buttons, highlights, and homepage theme.
                    The page updates live as you save.
                  </p>
                  <ColorField label="Primary Color" name="primary_color" value={form.primary_color} onChange={set} />
                  <ColorField label="Primary Dark (hover, sidebar deeper shade)" name="primary_dark_color" value={form.primary_dark_color} onChange={set} />
                  <ColorField label="Accent Color (gold highlights, watermarks)" name="accent_color" value={form.accent_color} onChange={set} />
                </div>
              )}

              {/* ── Advanced ── */}
              {activeTab === 'advanced' && (
                <div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">SVG Cycle Interval (seconds)</label>
                    <input name="svg_cycle_seconds" type="number" min={2} max={30} className="form-control" style={{ maxWidth: 120 }}
                      value={form.svg_cycle_seconds} onChange={set} />
                    <div className="form-text">
                      How long each SVG animation is shown before switching to the next.
                      Default: 5 seconds.
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* ── Live Preview panel ── */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white fw-semibold">
              <i className="bi bi-eye me-2" />Live Preview
            </div>
            <div className="card-body">
              {/* Logo preview */}
              <div className="mb-3">
                <p className="text-muted small mb-2">Navbar / Sidebar Logo</p>
                <div className="d-flex align-items-center gap-2 p-3 rounded"
                  style={{ background: form.primary_color }}>
                  <div className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: 36, height: 36, overflow: 'hidden', flexShrink: 0,
                      background: logoPreview || settings?.logo_image_url
                        ? 'transparent'
                        : `linear-gradient(135deg, ${form.primary_color}, ${form.primary_dark_color})`,
                      border: '2px solid rgba(255,255,255,0.3)',
                    }}>
                    {logoPreview
                      ? <img src={logoPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      : <LogoDisplay settings={{ ...settings, ...form }} size={24} />
                    }
                  </div>
                  <span className="text-white fw-bold" style={{ fontSize: '1.1rem' }}>
                    {form.site_name || 'ERCMS'}
                  </span>
                </div>
              </div>

              {/* Color swatches */}
              <div className="mb-3">
                <p className="text-muted small mb-2">Color Theme</p>
                <div className="d-flex gap-2">
                  {[
                    { label: 'Primary',      val: form.primary_color },
                    { label: 'Dark',         val: form.primary_dark_color },
                    { label: 'Accent',       val: form.accent_color },
                  ].map(c => (
                    <div key={c.label} className="text-center">
                      <div className="rounded-circle mx-auto mb-1"
                        style={{ width: 36, height: 36, background: c.val, border: '2px solid rgba(0,0,0,0.1)' }} />
                      <div className="text-muted" style={{ fontSize: '0.65rem' }}>{c.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hero text preview */}
              <div className="mb-3 p-3 rounded" style={{ background: '#f5f7fa' }}>
                <p className="text-muted small mb-1">Hero Title</p>
                <p className="fw-bold mb-0" style={{ color: form.primary_color, fontSize: '0.9rem' }}
                  dangerouslySetInnerHTML={{ __html: form.hero_title }} />
              </div>

              {/* Watermark preview */}
              <div className="p-3 rounded" style={{ background: '#0c1b14', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  fontSize: '0.85rem', fontWeight: 900, color: 'rgba(255,255,255,0.06)',
                  letterSpacing: '0.05em', marginBottom: '0.5rem',
                }}>
                  {form.watermark_1 || '—'}
                </div>
                <div className="text-white small" style={{ fontSize: '0.7rem', opacity: 0.5 }}>
                  SVG 1 watermark (faded behind animation)
                </div>
              </div>

              {/* Timing preview */}
              <div className="mt-3 p-2 bg-light rounded small text-muted">
                <i className="bi bi-clock me-1" />
                Animations cycle every <strong>{form.svg_cycle_seconds}s</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
