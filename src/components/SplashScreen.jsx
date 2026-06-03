import React, { useState, useEffect } from 'react';

export default function SplashScreen({ loading }) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Simulate progressive loading — fast to 80% quickly
  useEffect(() => {
    const t1 = setTimeout(() => setProgress(40), 40);
    const t2 = setTimeout(() => setProgress(65), 180);
    const t3 = setTimeout(() => setProgress(80), 380);
    const t4 = setTimeout(() => setProgress(88), 700);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, []);

  // When loading finishes: complete bar → fade out → unmount
  useEffect(() => {
    if (!loading) {
      setProgress(100);
      const t1 = setTimeout(() => setFadeOut(true), 150);
      const t2 = setTimeout(() => setHidden(true), 480);
      return () => [t1, t2].forEach(clearTimeout);
    }
  }, [loading]);

  if (hidden) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: fadeOut ? 'none' : 'all',
      }}
    >
      {/* ── Centered brand ─────────────────────────────────────── */}
      <div className="splash-brand">
        {/* Logo or icon fallback */}
        {!imgError ? (
          <img
            src="/rs-logo-full.png"
            alt="Reservation Safari"
            onError={() => setImgError(true)}
            style={{
              height: 64,
              width: 'auto',
              maxWidth: 220,
              objectFit: 'contain',
              display: 'block',
              margin: '0 auto',
            }}
          />
        ) : (
          <div
            style={{
              width: 80,
              height: 80,
              background: 'linear-gradient(145deg, #16a34a 0%, #0f7a34 100%)',
              borderRadius: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              boxShadow: '0 16px 48px rgba(22, 163, 74, 0.28), 0 4px 12px rgba(22, 163, 74, 0.15)',
            }}
          >
            <span
              style={{
                color: '#fff',
                fontSize: 26,
                fontWeight: 800,
                fontFamily: 'Poppins, sans-serif',
                letterSpacing: '-1px',
              }}
            >
              RS
            </span>
          </div>
        )}

        {/* App name */}
        <div
          style={{
            marginTop: imgError ? 20 : 18,
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontFamily: 'Poppins, sans-serif',
              fontSize: 18,
              fontWeight: 600,
              color: '#0f172a',
              letterSpacing: '-0.2px',
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            Reservation Safari
          </p>
          <p
            style={{
              fontFamily: 'Poppins, sans-serif',
              fontSize: 12,
              fontWeight: 400,
              color: '#94a3b8',
              letterSpacing: '0.3px',
              margin: '4px 0 0',
            }}
          >
            Safari Booking &amp; Management
          </p>
        </div>
      </div>

      {/* ── Hairline bottom progress bar ───────────────────────── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: 'rgba(22, 163, 74, 0.12)',
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #16a34a 0%, #22c55e 100%)',
            width: `${progress}%`,
            transition:
              progress === 100
                ? 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                : 'width 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
            borderRadius: '0 2px 2px 0',
          }}
        />
      </div>
    </div>
  );
}
