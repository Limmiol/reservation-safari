import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { localClient } from '@/api/localClient';
import { Eye, EyeOff, Loader2, BookOpen, Users, CreditCard, Car, Shield, Star, ArrowRight, User } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { translate } from '@/lib/translations';

const GREEN      = '#34C759';   // iMessage / iOS green
const GREEN_DARK = '#28A745';
const GREEN_GLOW = 'rgba(52,199,89,0.35)';

const ROLE_OPTIONS = [
  { value: 'agent',  label: 'Tour Agent',      desc: 'Book & manage tours' },
  { value: 'guide',  label: 'Safari Guide',    desc: 'View trips & assignments' },
  { value: 'client', label: 'Client',          desc: 'My bookings & invoices' },
  { value: 'other',  label: 'Other',           desc: 'General access' },
];

const STATS = [
  { value: '500+', label: 'Safaris Booked' },
  { value: '98%',  label: 'Satisfaction' },
  { value: '12+',  label: 'Destinations' },
];

const FEATURES = [
  { Icon: BookOpen,   label: 'Bookings' },
  { Icon: Users,      label: 'Clients' },
  { Icon: CreditCard, label: 'Payments' },
  { Icon: Car,        label: 'Vehicles' },
];

export default function Login() {
  const { language } = useLanguage();
  const t = (key) => translate(key, language);
  const [mode, setMode]               = useState('login');
  const [form, setForm]               = useState({ email: '', password: '', full_name: '', confirmPassword: '' });
  const [selectedRole, setSelectedRole] = useState('agent');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [showPass, setShowPass]       = useState(false);
  const [logoErr, setLogoErr]         = useState(false);
  const navigate = useNavigate();

  // Avatar animation state
  const [avatarStep, setAvatarStep] = useState(0);
  const [avatarVisible, setAvatarVisible] = useState(true);
  const avatarRef = useRef(null);
  const formRef = useRef(null);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'register' && form.password !== form.confirmPassword)
      return setError('Passwords do not match');
    if (form.password.length < 6)
      return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      if (mode === 'login') {
        await localClient.auth.login(form.email, form.password);
        navigate('/');
      } else {
        await localClient.auth.register(form.email, form.password, form.full_name, selectedRole);
        navigate(selectedRole === 'client' ? '/portal' : '/');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Avatar guidance logic
  useEffect(() => {
    const steps = mode === 'login' ? [
      { delay: 1000, element: '.l-seg' }, // Point to login/register toggle
      { delay: 2000, element: 'input[type="email"]' }, // Point to email field
      { delay: 2000, element: 'input[type="password"]' }, // Point to password field
      { delay: 2000, element: '.l-btn' }, // Point to submit button
    ] : [
      { delay: 1000, element: '.l-seg' }, // Point to login/register toggle
      { delay: 2000, element: 'input[placeholder*="full name"]' }, // Point to full name
      { delay: 2000, element: '.l-role' }, // Point to role selection
      { delay: 2000, element: 'input[type="email"]' }, // Point to email field
      { delay: 2000, element: 'input[type="password"]:first-of-type' }, // Point to password field
      { delay: 2000, element: 'input[type="password"]:last-of-type' }, // Point to confirm password
      { delay: 2000, element: '.l-btn' }, // Point to submit button
    ];

    let currentStep = 0;
    const timer = setInterval(() => {
      if (currentStep < steps.length) {
        setAvatarStep(currentStep);
        currentStep++;
      } else {
        setAvatarVisible(false);
      }
    }, steps[currentStep]?.delay || 2000);

    return () => clearInterval(timer);
  }, [mode]);

  // Get position of element to point to
  const getElementPosition = (selector) => {
    if (!formRef.current) return { x: 0, y: 0 };
    const element = formRef.current.querySelector(selector);
    if (!element) return { x: 0, y: 0 };
    const rect = element.getBoundingClientRect();
    const formRect = formRef.current.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - formRect.left,
      y: rect.top + rect.height / 2 - formRect.top,
    };
  };

  const currentTarget = mode === 'login' ? [
    '.l-seg', 'input[type="email"]', 'input[type="password"]', '.l-btn'
  ][avatarStep] : [
    '.l-seg', 'input[placeholder*="full name"]', '.l-role', 'input[type="email"]',
    'input[type="password"]:first-of-type', 'input[type="password"]:last-of-type', '.l-btn'
  ][avatarStep];

  const avatarPosition = getElementPosition(currentTarget || '.l-seg');

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'Poppins', sans-serif", position: 'relative', overflow: 'hidden' }}>

      <style>{`
        /* ── Keyframes ──────────────────────────── */
        @keyframes login-spin   { to { transform: rotate(360deg); } }
        @keyframes login-fadeup { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        @keyframes login-pulse-green { 0%,100%{ box-shadow: 0 0 0 0 ${GREEN_GLOW}; } 60%{ box-shadow: 0 0 0 8px rgba(52,199,89,0); } }

        /* ── Avatar animations ─────────────────── */
        @keyframes avatar-appear { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        @keyframes avatar-bounce { 0%, 100% { transform: translateY(0) rotate(0deg); } 25% { transform: translateY(-2px) rotate(-2deg); } 75% { transform: translateY(-2px) rotate(2deg); } }
        @keyframes bubble-appear { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        @keyframes pointer-wiggle { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-2px); } }

        /* ── Background ─────────────────────────── */
        .lbg {
          position: fixed;
          inset: 0;
          background-image: url('https://images.unsplash.com/photo-1549366021-9f761d450615?w=1000&q=75&auto=format');
          background-size: cover;
          background-position: center 30%;
          transform: scale(1.04);
          filter: brightness(0.55) saturate(1.1);
          z-index: 0;
        }

        /* ── Root layout ─────────────────────────── */
        .l-root {
          position: relative;
          z-index: 1;
          min-height: 100vh;
          display: flex;
          align-items: stretch;
        }

        /* ── Glass form panel ────────────────────── */
        .l-form-wrap {
          flex: 0 0 460px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 36px 28px;
        }
        .l-glass {
          width: 100%;
          background: rgba(255, 255, 255, 0.82);
          -webkit-backdrop-filter: blur(48px) saturate(180%);
          backdrop-filter: blur(48px) saturate(180%);
          border-radius: 28px;
          border: 1px solid rgba(255, 255, 255, 0.55);
          box-shadow:
            0 32px 80px rgba(0, 0, 0, 0.22),
            0 8px 24px rgba(0, 0, 0, 0.10),
            inset 0 1px 0 rgba(255, 255, 255, 0.7);
          padding: 40px 36px;
          animation: login-fadeup 0.55s cubic-bezier(0.4, 0, 0.2, 1) both;
        }

        /* ── Right hero panel ────────────────────── */
        .l-hero {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 56px 52px;
          animation: login-fadeup 0.65s 0.1s cubic-bezier(0.4, 0, 0.2, 1) both;
        }

        /* ── Segmented control ───────────────────── */
        .l-seg {
          display: flex;
          background: rgba(120,120,128,0.14);
          border-radius: 11px;
          padding: 3px;
          margin-bottom: 30px;
          gap: 0;
        }
        .l-seg-btn {
          flex: 1;
          padding: 9px 0;
          border-radius: 9px;
          border: none;
          background: transparent;
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
          color: rgba(30,30,30,0.55);
          letter-spacing: -0.01em;
        }
        .l-seg-btn.active {
          background: #fff;
          color: #1d1d1f;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.07);
        }

        /* ── Input ───────────────────────────────── */
        .l-input {
          width: 100%;
          padding: 13px 14px;
          border: 1.5px solid rgba(0,0,0,0.10);
          border-radius: 12px;
          font-size: 15px;
          outline: none;
          box-sizing: border-box;
          font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
          color: #1d1d1f;
          background: rgba(245,245,247,0.85);
          letter-spacing: -0.01em;
        }
        .l-input::placeholder { color: rgba(60,60,67,0.38); }
        .l-input:focus {
          border-color: ${GREEN};
          background: #fff;
          box-shadow: 0 0 0 4px rgba(52,199,89,0.14);
        }

        /* ── Role card ───────────────────────────── */
        .l-role {
          padding: 11px 13px;
          border-radius: 13px;
          cursor: pointer;
          border: 1.5px solid rgba(0,0,0,0.09);
          background: rgba(245,245,247,0.7);
          text-align: left;
          font-family: inherit;
          transition: all 0.18s;
        }
        .l-role:hover { border-color: ${GREEN}; background: rgba(52,199,89,0.06); }
        .l-role.sel   { border-color: ${GREEN}; background: rgba(52,199,89,0.10); box-shadow: 0 0 0 3px rgba(52,199,89,0.15); }

        /* ── Submit button ───────────────────────── */
        .l-btn {
          width: 100%;
          padding: 15px;
          background: ${GREEN};
          color: #fff;
          border: none;
          border-radius: 14px;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-family: inherit;
          letter-spacing: -0.01em;
          transition: transform 0.12s, box-shadow 0.2s, background 0.2s;
          box-shadow: 0 4px 16px ${GREEN_GLOW};
        }
        .l-btn:hover:not(:disabled) {
          background: #2DB84D;
          transform: translateY(-1px);
          box-shadow: 0 8px 28px ${GREEN_GLOW};
        }
        .l-btn:active:not(:disabled) { transform: translateY(0); }
        .l-btn:disabled { opacity: 0.65; cursor: not-allowed; }

        /* ── Feature pill ────────────────────────── */
        .l-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.24);
          border-radius: 980px;
          padding: 7px 14px;
          font-size: 12.5px;
          color: rgba(255,255,255,0.92);
          font-weight: 500;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          letter-spacing: -0.01em;
        }

        /* ── Stat card ───────────────────────────── */
        .l-stat {
          flex: 1;
          text-align: center;
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 16px;
          padding: 16px 10px;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        /* ── Badge ───────────────────────────────── */
        .l-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: rgba(52,199,89,0.22);
          border: 1px solid rgba(52,199,89,0.35);
          border-radius: 980px;
          padding: 7px 16px;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        /* ── Responsive ──────────────────────────── */
        @media (max-width: 960px) {
          .l-form-wrap { flex: 1 1 100%; max-width: 520px; margin: 0 auto; }
          .l-hero { display: none; }
          .l-root { justify-content: center; }
        }
        @media (max-width: 540px) {
          .l-form-wrap { padding: 20px 14px; }
          .l-glass { padding: 32px 24px; border-radius: 22px; }
        }
      `}</style>

      {/* ── Background image ──────────────────────── */}
      <div className="lbg" />

      {/* ── Subtle green tint overlay ─────────────── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: 'linear-gradient(135deg, rgba(52,199,89,0.08) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
        pointerEvents: 'none',
      }} />

      <div className="l-root">

        {/* ════════════════════════════════════════════
            LEFT  —  Glass Form Card
        ════════════════════════════════════════════ */}
        <div className="l-form-wrap">
          <div className="l-glass">

            {/* Logo */}
            <div style={{ marginBottom: '28px', textAlign: 'left' }}>
              {!logoErr ? (
                <img
                  src="/rs-logo-full.png"
                  alt="Reservation Safari"
                  onError={() => setLogoErr(true)}
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: 110,
                    objectFit: 'contain',
                    objectPosition: 'left center',
                    display: 'block',
                    marginBottom: 10,
                  }}
                />
              ) : (
                /* Fallback: icon badge + text */
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{
                    width: 52, height: 52,
                    background: `linear-gradient(145deg, ${GREEN} 0%, #28C847 100%)`,
                    borderRadius: 15, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 6px 20px ${GREEN_GLOW}`,
                  }}>
                    <span style={{ color: '#fff', fontSize: 20, fontWeight: 800, letterSpacing: '-1px' }}>RS</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.6px' }}>
                    Reservation Safari
                  </div>
                </div>
              )}
              <div style={{ fontSize: 13, color: 'rgba(60,60,67,0.48)', fontWeight: 400 }}>
                {mode === 'login' ? t('welcome_back_msg') : 'Create your account'}
              </div>
            </div>

            {/* Segmented control */}
            <div className="l-seg">
              {['login', 'register'].map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => { setMode(tab); setError(''); }}
                  className={`l-seg-btn${mode === tab ? ' active' : ''}`}
                >
                  {tab === 'login' ? t('sign_in') : t('register')}
                </button>
              ))}
            </div>

            {/* Animated Avatar Guide */}
            {avatarVisible && (
              <div
                ref={avatarRef}
                style={{
                  position: 'absolute',
                  zIndex: 10,
                  pointerEvents: 'none',
                  animation: 'avatar-appear 0.3s ease-out',
                  left: avatarPosition.x - 60,
                  top: avatarPosition.y - 80,
                  transition: 'left 0.8s cubic-bezier(0.4, 0, 0.2, 1), top 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: '50%',
                    background: `linear-gradient(145deg, ${GREEN} 0%, #28C847 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 6px 20px ${GREEN_GLOW}`,
                    border: '3px solid rgba(255,255,255,0.9)',
                    animation: 'avatar-bounce 2s ease-in-out infinite',
                  }}
                >
                  <User size={24} color="#fff" />
                </div>

                {/* Speech bubble */}
                <div
                  style={{
                    background: 'rgba(255,255,255,0.95)',
                    borderRadius: 12,
                    padding: '8px 12px',
                    marginTop: 8,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                    border: '1px solid rgba(0,0,0,0.1)',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#1d1d1f',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    backdropFilter: 'blur(8px)',
                    animation: 'bubble-appear 0.3s ease-out 0.2s both',
                  }}
                >
                  {avatarStep === 0 && (mode === 'login' ? 'Choose login or register' : 'Switch to register mode')}
                  {avatarStep === 1 && (mode === 'login' ? 'Enter your email' : 'Enter your full name')}
                  {avatarStep === 2 && (mode === 'login' ? 'Enter your password' : 'Select your role')}
                  {avatarStep === 3 && (mode === 'login' ? 'Click to sign in' : 'Enter your email')}
                  {avatarStep === 4 && 'Enter your password'}
                  {avatarStep === 5 && 'Confirm your password'}
                  {avatarStep === 6 && 'Click to create account'}
                </div>

                {/* Pointer */}
                <div
                  style={{
                    position: 'absolute',
                    top: 45,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: `12px solid rgba(255,255,255,0.95)`,
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                    animation: 'pointer-wiggle 1.5s ease-in-out infinite',
                  }}
                />
              </div>
            )}

            <div ref={formRef} style={{ position: 'relative' }}>
              <form onSubmit={submit}>
              {/* Full name */}
              {mode === 'register' && (
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>{t('full_name')}</label>
                  <input type="text" value={form.full_name} onChange={update('full_name')}
                    placeholder="Your full name" className="l-input" />
                </div>
              )}

              {/* Role picker */}
              {mode === 'register' && (
                <div style={{ marginBottom: 18 }}>
                  <label style={lbl}>I am a…</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 7 }}>
                    {ROLE_OPTIONS.map(opt => (
                      <button
                        key={opt.value} type="button"
                        onClick={() => setSelectedRole(opt.value)}
                        className={`l-role${selectedRole === opt.value ? ' sel' : ''}`}
                      >
                        <div style={{ fontSize: 13, fontWeight: 700, color: selectedRole === opt.value ? GREEN_DARK : '#1d1d1f', letterSpacing: '-0.01em' }}>
                          {opt.label}
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(60,60,67,0.55)', marginTop: 2, lineHeight: 1.3 }}>
                          {opt.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Email */}
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>{t('email_address')}</label>
                <input type="email" value={form.email} onChange={update('email')}
                  placeholder="you@example.com" required className="l-input" />
              </div>

              {/* Password */}
              <div style={{ marginBottom: mode === 'register' ? 14 : 22 }}>
                <label style={lbl}>{t('password')}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password} onChange={update('password')}
                    placeholder="••••••••" required
                    className="l-input" style={{ paddingRight: 46 }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{
                    position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(60,60,67,0.45)', padding: 0, display: 'flex',
                  }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              {mode === 'register' && (
                <div style={{ marginBottom: 22 }}>
                  <label style={lbl}>{t('confirm_password')}</label>
                  <input type="password" value={form.confirmPassword}
                    onChange={update('confirmPassword')} placeholder="••••••••"
                    required className="l-input" />
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={{
                  background: 'rgba(255,59,48,0.08)',
                  border: '1px solid rgba(255,59,48,0.22)',
                  borderRadius: 11, padding: '11px 14px',
                  marginBottom: 16, fontSize: 13.5,
                  color: '#C0392B', lineHeight: 1.5,
                }}>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading} className="l-btn">
                {loading
                  ? <Loader2 size={18} style={{ animation: 'login-spin 0.9s linear infinite' }} />
                  : <ArrowRight size={17} />
                }
                {mode === 'login' ? t('sign_in') : 'Create Account'}
              </button>
            </form>
            </div>

            {/* Footer note */}
            <p style={{ fontSize: 11.5, color: 'rgba(60,60,67,0.38)', marginTop: 22, textAlign: 'center', lineHeight: 1.5 }}>
              {t('data_stored_locally')}
            </p>
          </div>
        </div>

        {/* ════════════════════════════════════════════
            RIGHT  —  Hero panel
        ════════════════════════════════════════════ */}
        <div className="l-hero">

          {/* Top badge */}
          <div>
            <div className="l-badge">
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: GREEN,
                boxShadow: `0 0 0 3px rgba(52,199,89,0.3)`,
                animation: 'login-pulse-green 2.2s ease infinite',
              }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.92)', fontWeight: 600, letterSpacing: '0.3px' }}>
                TRUSTED SAFARI MANAGEMENT PLATFORM
              </span>
            </div>
          </div>

          {/* Headline block */}
          <div>
            <div style={{
              fontSize: 12, color: GREEN, fontWeight: 600,
              letterSpacing: '1.5px', textTransform: 'uppercase',
              marginBottom: 14,
            }}>
              All-in-one platform
            </div>
            <h1 style={{
              fontSize: 46, fontWeight: 800, color: '#ffffff',
              lineHeight: 1.1, marginBottom: 18, letterSpacing: '-1.5px',
            }}>
              Manage Your<br />Safari Operations
            </h1>
            <p style={{
              fontSize: 16, color: 'rgba(255,255,255,0.72)',
              lineHeight: 1.75, maxWidth: 420, marginBottom: 32,
              fontWeight: 300,
            }}>
              Bookings, clients, payments, vehicles, drivers and more — all in one place, stored securely on your machine.
            </p>

            {/* Feature pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 40 }}>
              {FEATURES.map(({ Icon, label }) => (
                <div key={label} className="l-pill">
                  <Icon size={13} />
                  {label}
                </div>
              ))}
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 12 }}>
              {STATS.map(s => (
                <div key={s.label} className="l-stat">
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: '-0.5px' }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 5, fontWeight: 500, letterSpacing: '0.2px' }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom rating */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 3 }}>
              {[1,2,3,4,5].map(i => (
                <Star key={i} size={13} fill="rgba(255,214,10,0.95)" color="rgba(255,214,10,0.95)" />
              ))}
            </div>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: 400 }}>
              Trusted by safari operators across East Africa
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}

const lbl = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#1d1d1f',
  marginBottom: 7,
  letterSpacing: '-0.01em',
};
