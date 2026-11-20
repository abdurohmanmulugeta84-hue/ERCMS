/**
 * HomePage — the ERCMS landing page.
 *
 * Contains:
 *   - Navbar (Home, Help links, Login/Register buttons)
 *   - Hero section with 3 SVGs that auto-cycle every 5s,
 *     each with a watermark headline and no description
 *   - Footer
 *
 * Login and Register forms float as glass modals over this page.
 * Help/FAQ lives on a separate /help route.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { register } from '../api/authApi';
import LogoDisplay from '../components/common/LogoDisplay';
import '../styles/homepage.css';

// ── The 3 SVGs that cycle in the hero ──────────────────────────────────────

const WATERMARKS = ['Equb Rotation', 'From Paper to Digital', 'The Rotation Cycle'];

// SVG 1: Original Equb rotation — figures in a circle with orbiting token
function SvgRotation() {
  const figures = [
    { x: 200, y: 50,  label: '🧑' },
    { x: 330, y: 125, label: '👩' },
    { x: 330, y: 275, label: '🧑' },
    { x: 200, y: 350, label: '👩' },
    { x: 70,  y: 275, label: '🧑' },
    { x: 70,  y: 125, label: '👩' },
  ];
  return (
    <svg className="hp-svg-rotation" viewBox="0 0 400 400" role="img" aria-label={WATERMARKS[0]}>
      <circle cx="200" cy="200" r="180" fill="rgba(45,158,96,0.04)" />
      <circle cx="200" cy="200" r="130" fill="rgba(244,168,29,0.03)" />
      <circle className="hp-ring" cx="200" cy="200" r="150" fill="none" stroke="rgba(45,158,96,0.35)" strokeWidth="2" />
      <circle cx="200" cy="200" r="38" fill="rgba(244,168,29,0.12)" stroke="rgba(244,168,29,0.4)" strokeWidth="2" />
      <text x="200" y="208" textAnchor="middle" fontSize="28" fill="rgba(244,168,29,0.8)">💰</text>
      <g className="hp-token">
        <circle cx="200" cy="50" r="8" fill="var(--hp-gold)">
          <animate attributeName="r" values="8;10;8" dur="1.5s" repeatCount="indefinite" />
        </circle>
      </g>
      {figures.map((f, i) => (
        <g className="hp-figure" key={i} style={{ transformOrigin: `${f.x}px ${f.y}px` }}>
          <circle cx={f.x} cy={f.y} r="22" fill="rgba(45,158,96,0.15)" stroke="rgba(45,158,96,0.4)" strokeWidth="1.5" />
          <text x={f.x} y={f.y + 6} textAnchor="middle" fontSize="20">{f.label}</text>
        </g>
      ))}
      {figures.map((f, i) => (
        <line key={i} x1="200" y1="200" x2={f.x} y2={f.y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 4" />
      ))}
    </svg>
  );
}

// SVG 2: Paper → Digital transformation
function SvgTransformation({ active }) {
  return (
    <svg className="hp-svg-rotation" viewBox="0 0 480 400" role="img" aria-label={WATERMARKS[1]}>
      {/* Left: messy papers (crumble when active) */}
      <g className={`hp-paper-stack ${active ? 'crumble' : ''}`}>
        <rect x="10" y="280" width="200" height="60" rx="4" fill="rgba(139,69,19,0.15)" />
        <rect x="30" y="160" width="140" height="100" rx="2" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" transform="rotate(-5 100 210)" />
        <rect x="35" y="150" width="130" height="90"  rx="2" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" transform="rotate(3 100 195)" />
        <rect x="40" y="140" width="120" height="80"  rx="2" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" transform="rotate(-2 100 180)" />
        <line x1="50" y1="150" x2="140" y2="148" stroke="rgba(100,100,100,0.4)" strokeWidth="1" />
        <line x1="50" y1="160" x2="130" y2="158" stroke="rgba(100,100,100,0.4)" strokeWidth="1" />
        <line x1="50" y1="170" x2="145" y2="168" stroke="rgba(100,100,100,0.4)" strokeWidth="1" />
        <line x1="50" y1="185" x2="120" y2="183" stroke="rgba(100,100,100,0.4)" strokeWidth="1" />
        <rect x="60" y="210" width="50" height="55" rx="4" fill="rgba(80,80,80,0.3)" stroke="rgba(255,255,255,0.15)" />
        <rect x="65" y="215" width="40" height="12" rx="2" fill="rgba(0,0,0,0.3)" />
        <circle cx="72" cy="236" r="3" fill="rgba(255,255,255,0.2)" />
        <circle cx="82" cy="236" r="3" fill="rgba(255,255,255,0.2)" />
        <circle cx="92" cy="236" r="3" fill="rgba(255,255,255,0.2)" />
        <text x="160" y="175" fontSize="28">😓</text>
      </g>

      {/* Arrow */}
      <path className={`hp-glow-arrow ${active ? 'flow' : ''}`} d="M 210 200 Q 240 200 270 200" fill="none" stroke="rgba(45,158,96,0.6)" strokeWidth="3" strokeLinecap="round" />
      <path className={`hp-glow-arrow ${active ? 'flow' : ''}`} d="M 265 192 L 280 200 L 265 208" fill="none" stroke="rgba(45,158,96,0.8)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      {/* Right: digital dashboard (builds when active) */}
      <g className={`hp-screen-build ${active ? 'build' : ''}`}>
        <rect x="290" y="110" width="170" height="120" rx="8" fill="rgba(20,40,30,0.6)" stroke="rgba(45,158,96,0.4)" strokeWidth="2" />
        <rect x="298" y="118" width="154" height="104" rx="4" fill="rgba(0,0,0,0.2)" />
        <rect x="298" y="118" width="154" height="14" rx="2" fill="rgba(45,158,96,0.2)" />
        <circle cx="306" cy="125" r="3" fill="rgba(244,168,29,0.6)" />
        <rect x="314" y="123" width="40" height="4" rx="1" fill="rgba(255,255,255,0.15)" />
        <rect x="304" y="138" width="42" height="24" rx="4" fill="rgba(45,158,96,0.15)" stroke="rgba(45,158,96,0.25)" />
        <text x="325" y="154" textAnchor="middle" fontSize="9" fill="rgba(45,158,96,0.8)" fontWeight="bold">500</text>
        <rect x="352" y="138" width="42" height="24" rx="4" fill="rgba(244,168,29,0.1)" stroke="rgba(244,168,29,0.25)" />
        <text x="373" y="154" textAnchor="middle" fontSize="9" fill="rgba(244,168,29,0.8)" fontWeight="bold">12</text>
        <rect x="400" y="138" width="42" height="24" rx="4" fill="rgba(25,135,84,0.1)" stroke="rgba(25,135,84,0.25)" />
        <text x="421" y="154" textAnchor="middle" fontSize="9" fill="rgba(25,135,84,0.8)" fontWeight="bold">✓</text>
        <rect x="308" y="180" width="12" height="30" rx="2" fill="rgba(45,158,96,0.3)" />
        <rect x="324" y="188" width="12" height="22" rx="2" fill="rgba(45,158,96,0.4)" />
        <rect x="340" y="175" width="12" height="35" rx="2" fill="rgba(45,158,96,0.5)" />
        <rect x="356" y="182" width="12" height="28" rx="2" fill="rgba(244,168,29,0.4)" />
        <rect x="372" y="168" width="12" height="42" rx="2" fill="rgba(244,168,29,0.5)" />
        <circle cx="375" cy="230" r="18" fill="rgba(45,158,96,0.2)" stroke="rgba(45,158,96,0.6)" strokeWidth="2" />
        <path d="M 368 230 L 373 235 L 383 225" fill="none" stroke="rgba(45,158,96,0.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="415" y="235" fontSize="24">😊</text>
      </g>
    </svg>
  );
}

// SVG 3: Rotation lifecycle cycle
function SvgCycle({ active }) {
  return (
    <svg className="hp-svg-rotation" viewBox="0 0 500 400" role="img" aria-label={WATERMARKS[2]}>
      <circle className={`hp-cycle-ring-1 ${active ? 'draw' : ''}`} cx="250" cy="200" r="160" fill="none" stroke="rgba(45,158,96,0.2)" strokeWidth="2" />
      <circle className="hp-cycle-flow" cx="250" cy="200" r="160" fill="none" stroke="rgba(45,158,96,0.3)" strokeWidth="1.5" strokeDasharray="12 8" />

      <g className={`hp-cycle-step ${active ? 'pop' : ''}`} transform="translate(250, 40)">
        <circle r="38" fill="rgba(45,158,96,0.12)" stroke="rgba(45,158,96,0.4)" strokeWidth="2" />
        <text textAnchor="middle" y="-2" fontSize="22">👥</text>
        <text textAnchor="middle" y="14" fontSize="9" fill="rgba(255,255,255,0.6)" fontWeight="bold">JOIN</text>
      </g>
      <g className={`hp-cycle-step ${active ? 'pop' : ''}`} transform="translate(410, 200)">
        <circle r="38" fill="rgba(244,168,29,0.12)" stroke="rgba(244,168,29,0.4)" strokeWidth="2" />
        <text textAnchor="middle" y="-2" fontSize="22">💵</text>
        <text textAnchor="middle" y="14" fontSize="8" fill="rgba(255,255,255,0.6)" fontWeight="bold">PAY</text>
      </g>
      <g className={`hp-cycle-step ${active ? 'pop' : ''}`} transform="translate(250, 360)">
        <circle r="38" fill="rgba(25,135,84,0.12)" stroke="rgba(25,135,84,0.4)" strokeWidth="2" />
        <text textAnchor="middle" y="-2" fontSize="22">🎁</text>
        <text textAnchor="middle" y="14" fontSize="8" fill="rgba(255,255,255,0.6)" fontWeight="bold">RECEIVE</text>
      </g>
      <g className={`hp-cycle-step ${active ? 'pop' : ''}`} transform="translate(90, 200)">
        <circle r="38" fill="rgba(13,110,253,0.12)" stroke="rgba(13,110,253,0.4)" strokeWidth="2" />
        <text textAnchor="middle" y="-2" fontSize="22">🔄</text>
        <text textAnchor="middle" y="14" fontSize="8" fill="rgba(255,255,255,0.6)" fontWeight="bold">ROTATE</text>
      </g>

      <path d="M 288 50 Q 380 80 400 162" fill="none" stroke="rgba(45,158,96,0.2)" strokeWidth="1.5" strokeDasharray="4 4" className="hp-cycle-flow" />
      <path d="M 400 238 Q 380 320 288 350" fill="none" stroke="rgba(45,158,96,0.2)" strokeWidth="1.5" strokeDasharray="4 4" className="hp-cycle-flow" />
      <path d="M 212 350 Q 120 320 100 238" fill="none" stroke="rgba(45,158,96,0.2)" strokeWidth="1.5" strokeDasharray="4 4" className="hp-cycle-flow" />
      <path d="M 100 162 Q 120 80 212 50" fill="none" stroke="rgba(45,158,96,0.2)" strokeWidth="1.5" strokeDasharray="4 4" className="hp-cycle-flow" />

      <g className={`hp-cycle-center ${active ? '' : ''}`} style={{ opacity: active ? 1 : 0, transition: 'opacity 0.8s ease 0.6s' }}>
        <circle cx="250" cy="200" r="42" fill="rgba(244,168,29,0.08)" stroke="rgba(244,168,29,0.3)" strokeWidth="2" />
        <text x="250" y="208" textAnchor="middle" fontSize="28">💰</text>
      </g>
    </svg>
  );
}

const SVGS = [SvgRotation, SvgTransformation, SvgCycle];

// ── Login Modal ──────────────────────────────────────────────────────────────
function LoginModal({ form, setForm, onClose, onSwitchToRegister }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password) { setError('Please enter your username and password.'); return; }
    setLoading(true); setError(null);
    try {
      await login(form.username.trim(), form.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.detail || 'Login failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className="hp-modal-overlay" onClick={onClose}>
      <div className="hp-modal-card" onClick={e => e.stopPropagation()}>
        <button className="hp-modal-close" onClick={onClose} aria-label="Close login">×</button>
        <h2 className="hp-modal-title">Welcome back</h2>
        <p className="hp-modal-sub">Sign in to your ERCMS account</p>
        {error && <div className="hp-error-box">{error}</div>}
        <form onSubmit={handleSubmit} noValidate>
          <div className="hp-field">
            <label htmlFor="hp_username">Username</label>
            <input id="hp_username" name="username" type="text" autoComplete="username"
              value={form.username} onChange={handleChange} autoFocus required
              placeholder="Enter your username" disabled={loading} />
          </div>
          <div className="hp-field">
            <label htmlFor="hp_password">Password</label>
            <div className="input-group">
              <input id="hp_password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                value={form.password} onChange={handleChange} required
                placeholder="Enter your password" disabled={loading} />
              <button type="button" className="btn btn-outline-secondary" onClick={() => setShowPassword(s => !s)} tabIndex={-1}
                aria-label={showPassword ? 'Hide' : 'Show'} style={{ borderColor: 'rgba(255,255,255,0.18)' }}>
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
              </button>
            </div>
          </div>
          <button type="submit" className="hp-btn-primary w-100 mt-2" disabled={loading} style={{ padding: '0.7rem', fontSize: '0.95rem' }}>
            {loading ? <><span className="spinner-border spinner-border-sm me-2" />Signing in…</> : 'Sign In'}
          </button>
        </form>
        <p className="hp-switch-link">Don't have an account? <a onClick={onSwitchToRegister}>Register here</a></p>
      </div>
    </div>
  );
}

// ── Register Modal ───────────────────────────────────────────────────────────
function RegisterModal({ form, setForm, onClose, onSwitchToLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => { setForm(prev => ({ ...prev, [e.target.name]: e.target.value })); setError(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.password_confirm) { setError('Passwords do not match.'); return; }
    setLoading(true); setError(null);
    try {
      const result = await register(form);
      setSuccess(result.detail);
    } catch (err) { setError(err?.response?.data || 'Registration failed.'); }
    finally { setLoading(false); }
  };

  if (success) {
    const isPending = success.toLowerCase().includes('approval');
    return (
      <div className="hp-modal-overlay" onClick={onClose}>
        <div className="hp-modal-card text-center" onClick={e => e.stopPropagation()}>
          <button className="hp-modal-close" onClick={onClose} aria-label="Close">×</button>
          <i className={`bi ${isPending ? 'bi-hourglass-split' : 'bi-check-circle-fill'}`}
            style={{ fontSize: '3rem', color: isPending ? '#f4a81d' : '#2d9e60' }} />
          <h2 className="hp-modal-title mt-3">{isPending ? 'Account Submitted' : 'Account Created!'}</h2>
          <p className="hp-modal-sub mt-2" style={{ whiteSpace: 'pre-wrap' }}>{success}</p>
          {!isPending && <button className="hp-btn-primary mt-2" onClick={onSwitchToLogin}>Go to Login</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="hp-modal-overlay" onClick={onClose}>
      <div className="hp-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <button className="hp-modal-close" onClick={onClose} aria-label="Close">×</button>
        <h2 className="hp-modal-title">Create an Account</h2>
        <p className="hp-modal-sub">Join the Equb Management System</p>
        {error && (
          <div className="hp-error-box">
            {typeof error === 'string' ? error
              : Object.entries(error).map(([k, v]) => <div key={k}>{k === 'non_field_errors' ? '' : `${k}: `}{Array.isArray(v) ? v.join(', ') : v}</div>)}
          </div>
        )}
        <form onSubmit={handleSubmit} noValidate>
          <div className="row g-2">
            <div className="col-6"><div className="hp-field"><label>First Name <span style={{ color: '#dc3545' }}>*</span></label><input name="first_name" type="text" required autoFocus value={form.first_name} onChange={handleChange} disabled={loading} placeholder="Abebe" /></div></div>
            <div className="col-6"><div className="hp-field"><label>Last Name <span style={{ color: '#dc3545' }}>*</span></label><input name="last_name" type="text" required value={form.last_name} onChange={handleChange} disabled={loading} placeholder="Kebede" /></div></div>
          </div>
          <div className="hp-field"><label>Username <span style={{ color: '#dc3545' }}>*</span></label><input name="username" type="text" required autoComplete="username" value={form.username} onChange={handleChange} disabled={loading} placeholder="Choose a username" /></div>
          <div className="hp-field"><label>Email <span style={{ color: '#dc3545' }}>*</span></label><input name="email" type="email" required autoComplete="email" value={form.email} onChange={handleChange} disabled={loading} placeholder="you@example.com" /></div>
          <div className="hp-field"><label>Phone <span style={{ color: 'rgba(255,255,255,0.45)' }}>(optional)</span></label><input name="phone" type="tel" value={form.phone} onChange={handleChange} disabled={loading} placeholder="09XXXXXXXX" /></div>
          <div className="hp-field"><label>Role <span style={{ color: '#dc3545' }}>*</span></label>
            <select name="role" value={form.role} onChange={handleChange} disabled={loading}>
              <option value="member">Equb Member</option><option value="organizer">Equb Organizer</option>
              <option value="treasurer">Treasurer</option><option value="auditor">Auditor</option>
            </select>
            {form.role !== 'member' && <div style={{ fontSize: '0.75rem', color: '#f4a81d', marginTop: '0.35rem' }}><i className="bi bi-info-circle me-1" />Requires Administrator approval before login.</div>}
          </div>
          <div className="row g-2">
            <div className="col-6"><div className="hp-field"><label>Password <span style={{ color: '#dc3545' }}>*</span></label><input name="password" type={showPassword ? 'text' : 'password'} required autoComplete="new-password" value={form.password} onChange={handleChange} disabled={loading} placeholder="Min 8 chars" /></div></div>
            <div className="col-6"><div className="hp-field"><label>Confirm <span style={{ color: '#dc3545' }}>*</span></label><div className="input-group"><input name="password_confirm" type={showPassword ? 'text' : 'password'} required autoComplete="new-password" value={form.password_confirm} onChange={handleChange} disabled={loading} placeholder="Repeat" /><button type="button" className="btn btn-outline-secondary" onClick={() => setShowPassword(s => !s)} tabIndex={-1} style={{ borderColor: 'rgba(255,255,255,0.18)' }} aria-label={showPassword ? 'Hide' : 'Show'}><i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} /></button></div></div></div>
          </div>
          <button type="submit" className="hp-btn-primary w-100 mt-2" disabled={loading} style={{ padding: '0.7rem', fontSize: '0.95rem' }}>
            {loading ? <><span className="spinner-border spinner-border-sm me-2" />Creating…</> : 'Create Account'}
          </button>
        </form>
        <p className="hp-switch-link">Already have an account? <a onClick={onSwitchToLogin}>Sign in</a></p>
      </div>
    </div>
  );
}

// ── Main HomePage ───────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate();
  const { settings } = useSiteSettings();
  const [scrolled, setScrolled]       = useState(false);
  const [mobileMenuOpen, setMobileMenu] = useState(false);
  const [showLogin, setShowLogin]     = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [activeSvg, setActiveSvg]     = useState(0);

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    first_name: '', last_name: '', username: '', email: '',
    phone: '', role: 'member', password: '', password_confirm: '',
  });

  // Scroll listener for navbar
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Auto-cycle SVGs based on settings
  useEffect(() => {
    const seconds = settings?.svg_cycle_seconds || 5;
    const interval = setInterval(() => {
      setActiveSvg(prev => (prev + 1) % SVGS.length);
    }, seconds * 1000);
    return () => clearInterval(interval);
  }, [settings?.svg_cycle_seconds]);

  // Close mobile menu on resize
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 768) setMobileMenu(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const openLogin    = () => { setShowRegister(false); setShowLogin(true); };
  const openRegister = () => { setShowLogin(false); setShowRegister(true); };

  const ActiveSvg = SVGS[activeSvg];

  return (
    <div className="hp-wrapper">
      {/* ── Navbar ── */}
      <nav className={`hp-navbar ${scrolled ? 'scrolled' : ''}`} role="navigation" aria-label="Main navigation">
        <a className="hp-nav-brand" href="#" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <span className="brand-icon">
            <LogoDisplay settings={settings} size={22} />
          </span>
          {settings?.site_name || 'ERCMS'}
        </a>
        <ul className="hp-nav-links">
          <li><a onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Home</a></li>
          <li><a onClick={() => navigate('/help')}>Help</a></li>
        </ul>
        <div className="hp-nav-actions">
          <button className="hp-btn-outline" onClick={openLogin}>Login</button>
          <button className="hp-btn-primary" onClick={openRegister}>Register</button>
        </div>
        <button className="hp-nav-toggle" onClick={() => setMobileMenu(o => !o)} aria-label="Toggle menu" aria-expanded={mobileMenuOpen}>
          <i className={`bi ${mobileMenuOpen ? 'bi-x' : 'bi-list'}`} />
        </button>
      </nav>

      {mobileMenuOpen && (
        <div className="hp-mobile-menu open">
          <a onClick={() => { setMobileMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Home</a>
          <a onClick={() => { setMobileMenu(false); navigate('/help'); }}>Help</a>
          <div className="d-flex gap-2 mt-2">
            <button className="hp-btn-outline flex-grow-1" onClick={openLogin}>Login</button>
            <button className="hp-btn-primary flex-grow-1" onClick={openRegister}>Register</button>
          </div>
        </div>
      )}

      {/* ── Hero with cycling SVGs ── */}
      <section className="hp-hero" id="home">
        <div className="hp-hero-grid">
          <div className="hp-hero-text">
            <h1 className="hp-hero-title" dangerouslySetInnerHTML={{ __html: settings?.hero_title || 'Equb Management,<br />Modernized.' }} />
            <p className="hp-hero-sub">
              {settings?.hero_subtitle || 'A centralized platform for managing traditional Ethiopian Equb savings groups.'}
            </p>
            <div className="hp-hero-cta">
              <button className="hp-btn-primary" onClick={openRegister} style={{ fontSize: '1rem', padding: '0.8rem 2rem' }}>
                <i className="bi bi-arrow-right-circle me-2" />{settings?.cta_primary_text || 'Get Started'}
              </button>
              <button className="hp-btn-outline" onClick={openLogin} style={{ fontSize: '1rem', padding: '0.8rem 2rem' }}>
                {settings?.cta_secondary_text || 'Login'}
              </button>
            </div>
          </div>

          {/* SVG area with watermark + cycling animation */}
          <div className="hp-hero-art" style={{ position: 'relative' }}>
            {/* Watermark headline behind the SVG */}
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 'clamp(1.5rem, 4vw, 2.8rem)',
              fontWeight: 900,
              color: 'rgba(255,255,255,0.05)',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 0,
              letterSpacing: '0.05em',
              transition: 'opacity 0.6s ease',
              opacity: 1,
            }}>
              {([settings?.watermark_1, settings?.watermark_2, settings?.watermark_3] || WATERMARKS)[activeSvg]}
            </div>

            {/* Cycling SVGs — only the active one is visible */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              {SVGS.map((SvgComp, i) => (
                <div key={i} style={{
                  opacity: activeSvg === i ? 1 : 0,
                  transition: 'opacity 0.8s ease-in-out, transform 0.8s ease-in-out',
                  transform: activeSvg === i ? 'scale(1)' : 'scale(0.9)',
                  position: activeSvg === i ? 'relative' : 'absolute',
                  top: activeSvg === i ? 'auto' : 0,
                  left: activeSvg === i ? 'auto' : 0,
                  width: '100%',
                  pointerEvents: activeSvg === i ? 'auto' : 'none',
                }}>
                  {i === 0 && <SvgComp />}
                  {i === 1 && <SvgComp active={activeSvg === 1} />}
                  {i === 2 && <SvgComp active={activeSvg === 2} />}
                </div>
              ))}
            </div>

            {/* Dots indicator */}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem' }}>
              {SVGS.map((_, i) => {
                const wms = [settings?.watermark_1, settings?.watermark_2, settings?.watermark_3] || WATERMARKS;
                return (
                  <button key={i} onClick={() => setActiveSvg(i)}
                    aria-label={`Show ${wms[i]}`}
                    style={{
                      width: activeSvg === i ? 24 : 8, height: 8,
                      borderRadius: 4, border: 'none',
                      background: activeSvg === i ? 'var(--hp-primary)' : 'rgba(255,255,255,0.2)',
                      cursor: 'pointer', transition: 'all 0.3s ease',
                    }} />
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="hp-footer">
        <p className="mb-1"><strong>{settings?.site_name || 'ERCMS'}</strong> — Equb Rotation &amp; Contribution Management System</p>
        <p className="mb-0">{settings?.footer_text || 'Kombolcha Institute of Technology · Department of Software Engineering · 2026'}</p>
      </footer>

      {/* ── Login modal ── */}
      {showLogin && <LoginModal form={loginForm} setForm={setLoginForm} onClose={() => setShowLogin(false)} onSwitchToRegister={openRegister} />}

      {/* ── Register modal ── */}
      {showRegister && <RegisterModal form={registerForm} setForm={setRegisterForm} onClose={() => setShowRegister(false)} onSwitchToLogin={openLogin} />}
    </div>
  );
}
