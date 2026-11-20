/**
 * HelpPage — FAQ and help information on a separate route.
 *
 * Shares the same dark theme and navbar style as the homepage.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSiteSettings } from '../hooks/useSiteSettings';
import LogoDisplay from '../components/common/LogoDisplay';
import '../styles/homepage.css';

const FAQS = [
  { q: 'What is Equb?', a: 'Equb is a traditional Ethiopian rotating savings arrangement where members contribute money regularly and take turns receiving the collected funds according to an agreed rotation order.' },
  { q: 'Who can use ERCMS?', a: 'Five roles are supported: System Administrator, Equb Organizer, Treasurer, Equb Member, and Auditor. Each role has specific permissions enforced on the server.' },
  { q: 'How do I register?', a: 'Click "Register" and fill in your details. Members are activated immediately. Organizers, Treasurers, and Auditors require Administrator approval before they can log in.' },
  { q: 'Is my financial data secure?', a: 'Yes. All access is authenticated, role-based permissions prevent unauthorized access, and every significant action is recorded in an immutable audit log.' },
  { q: 'Can I use ERCMS on mobile?', a: 'The web application is fully responsive and works on any modern browser. A dedicated Android application is planned for future release.' },
  { q: 'Does ERCMS support payment integration?', a: 'M-Pesa and Chapa payment methods are supported in the system design. Actual gateway integration depends on provider API availability and configuration.' },
  { q: 'How does the rotation schedule work?', a: 'The Organizer creates a rotation schedule and manually assigns each approved member a position number. Position 1 receives the first payout, position 2 the second, and so on. The Treasurer processes payouts according to this schedule.' },
  { q: 'What happens if a member misses a contribution?', a: 'The system tracks outstanding contributions per period. The Treasurer can view which members have not yet contributed for any given period, and contributions cannot be duplicated for the same member and period.' },
  { q: 'Can a member withdraw from an Equb?', a: 'Yes. A member submits a withdrawal request through the system. The Organizer reviews and approves or rejects it. The member is notified of the decision via in-app notification and email.' },
  { q: 'How are payouts protected from errors?', a: 'Each rotation entry can only be paid out once — enforced by a database-level unique constraint. Payouts are processed in atomic database transactions, and the rotation entry is automatically marked as completed when a payout is recorded.' },
];

function HelpItem({ q, a, isOpen, onClick }) {
  return (
    <div className={`hp-help-item ${isOpen ? 'open' : ''}`}>
      <div className="hp-help-q" onClick={onClick} role="button" tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}>
        <span>{q}</span>
        <i className="bi bi-chevron-down chevron" aria-hidden="true" />
      </div>
      <div className="hp-help-a">{a}</div>
    </div>
  );
}

export default function HelpPage() {
  const navigate = useNavigate();
  const { settings } = useSiteSettings();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenu] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 768) setMobileMenu(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="hp-wrapper">
      {/* ── Navbar ── */}
      <nav className={`hp-navbar ${scrolled ? 'scrolled' : ''}`} role="navigation" aria-label="Main navigation">
        <a className="hp-nav-brand" href="#" onClick={e => { e.preventDefault(); navigate('/'); }}>
          <span className="brand-icon">
            <LogoDisplay settings={settings} size={22} />
          </span>
          {settings?.site_name || 'ERCMS'}
        </a>
        <ul className="hp-nav-links">
          <li><a onClick={() => navigate('/')}>Home</a></li>
          <li><a onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Help</a></li>
        </ul>
        <div className="hp-nav-actions">
          <button className="hp-btn-outline" onClick={() => navigate('/')}>Login</button>
          <button className="hp-btn-primary" onClick={() => navigate('/')}>Register</button>
        </div>
        <button className="hp-nav-toggle" onClick={() => setMobileMenu(o => !o)} aria-label="Toggle menu" aria-expanded={mobileMenuOpen}>
          <i className={`bi ${mobileMenuOpen ? 'bi-x' : 'bi-list'}`} />
        </button>
      </nav>

      {mobileMenuOpen && (
        <div className="hp-mobile-menu open">
          <a onClick={() => { setMobileMenu(false); navigate('/'); }}>Home</a>
          <a onClick={() => { setMobileMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Help</a>
          <div className="d-flex gap-2 mt-2">
            <button className="hp-btn-outline flex-grow-1" onClick={() => navigate('/')}>Login</button>
            <button className="hp-btn-primary flex-grow-1" onClick={() => navigate('/')}>Register</button>
          </div>
        </div>
      )}

      {/* ── Help / FAQ ── */}
      <section className="hp-help" id="help" style={{ paddingTop: '8rem' }}>
        <h2 className="hp-help-title">Help &amp; FAQ</h2>
        <p className="hp-help-sub">Common questions about ERCMS and how it works.</p>
        <div className="hp-help-accordion">
          {FAQS.map((faq, i) => (
            <HelpItem
              key={i}
              q={faq.q}
              a={faq.a}
              isOpen={openFaq === i}
              onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
            />
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="hp-footer">
        <p className="mb-1"><strong>{settings?.site_name || 'ERCMS'}</strong> — Equb Rotation &amp; Contribution Management System</p>
        <p className="mb-0">{settings?.footer_text || 'Kombolcha Institute of Technology · Department of Software Engineering · 2026'}</p>
      </footer>
    </div>
  );
}
