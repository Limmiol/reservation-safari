import React from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowRight, Map, Users, Shield, BarChart3 } from 'lucide-react';

export default function Landing() {
  const handleLogin = async () => {
    await base44.auth.redirectToLogin();
  };

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <style>{`
        .landing-hero { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
        .landing-features { display: grid; grid-template-columns: repeat(4, 1fr); gap: 30px; }
        .landing-hero-img { display: flex; }
        @media (max-width: 900px) {
          .landing-hero { grid-template-columns: 1fr; gap: 32px; }
          .landing-features { grid-template-columns: 1fr 1fr; gap: 16px; }
          .landing-hero-img { display: none; }
        }
        @media (max-width: 560px) {
          .landing-features { grid-template-columns: 1fr; }
        }
      `}</style>
      {/* Navigation */}
      <nav style={{ background: '#ffffff', borderBottom: '1px solid #e8e8e8', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#2ecc71', letterSpacing: '-0.5px' }}>Reservation Safari</div>
        </div>
        <button
          onClick={handleLogin}
          style={{
            background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
            color: '#ffffff',
            border: 'none',
            padding: '10px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero" style={{
        background: 'linear-gradient(135deg, #f0faf3 0%, #ffffff 100%)',
        padding: '60px 24px',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Left Content */}
        <div>
          <h1 style={{
           fontSize: '48px',
           fontWeight: '800',
           color: '#1a1a1a',
           lineHeight: '1.2',
           marginBottom: '20px'
          }}>
           Your Safari Operations,<br />
            <span style={{ color: '#2ecc71' }}>Streamlined & Express</span>
          </h1>
          <p style={{
           fontSize: '18px',
           color: '#555555',
           lineHeight: '1.8',
           marginBottom: '40px'
          }}>
           Reservation Safari is the #1 safari management software for African tour operators. Manage bookings, payments, vehicles, drivers, equipment, and create unforgettable safari experiences — all in one powerful platform.
          </p>

          <button
            onClick={handleLogin}
            style={{
              background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '16px 40px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.3s ease',
              boxShadow: '0 10px 30px rgba(46, 158, 79, 0.2)'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
          >
            Get Started <ArrowRight size={20} />
          </button>

          <p style={{
            fontSize: '13px',
            color: '#888888',
            marginTop: '20px'
          }}>
            ✓ No credit card required · ✓ 24-hour setup · ✓ Free for 14 days
          </p>
        </div>

        {/* Right Image */}
        <div className="landing-hero-img" style={{
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            position: 'absolute',
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(46, 158, 79, 0.1) 0%, transparent 70%)',
            borderRadius: '50%',
            zIndex: '1'
          }} />
          <img
            src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&q=80"
            alt="Happy user with safari"
            style={{
              width: '100%',
              maxWidth: '500px',
              borderRadius: '20px',
              boxShadow: '0 30px 60px rgba(0, 0, 0, 0.15)',
              position: 'relative',
              zIndex: '2'
            }}
          />
        </div>
      </section>

      {/* Features Section */}
      <section style={{
        padding: '60px 24px',
        background: '#ffffff',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{
            fontSize: '36px',
            fontWeight: '800',
            color: '#1a1a1a',
            marginBottom: '16px'
          }}>
            Complete Safari Management & Booking System
          </h2>
          <p style={{
            fontSize: '18px',
            color: '#555555'
          }}>
            Professional safari booking software with integrated payment processing, resource management, and client CRM
          </p>
        </div>

        <div className="landing-features">
          {[
            { icon: Users, title: 'Client Management & CRM', desc: 'Track contacts, bookings, documents, and feedback from safari clients' },
            { icon: Map, title: 'Safari Booking System', desc: 'Create safari quotes, manage reservations, track booking status and payments' },
            { icon: BarChart3, title: 'Payment & Financial Tools', desc: 'Invoicing, payment processing, revenue tracking and financial reporting' },
            { icon: Shield, title: 'Resource & Fleet Management', desc: 'Manage safari vehicles, drivers, equipment, and resource assignments' }
          ].map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={i}
                style={{
                  background: '#f9f9f9',
                  padding: '30px 24px',
                  borderRadius: '12px',
                  border: '1px solid #e8e8e8',
                  textAlign: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f0faf3';
                  e.currentTarget.style.borderColor = '#2ecc71';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(46, 158, 79, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f9f9f9';
                  e.currentTarget.style.borderColor = '#e8e8e8';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: '#f0faf3',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2ecc71',
                  margin: '0 auto 16px'
                }}>
                  <Icon size={24} />
                </div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#1a1a1a',
                  marginBottom: '8px'
                }}>
                  {feature.title}
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#666666',
                  lineHeight: '1.6'
                }}>
                  {feature.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
        padding: '60px 24px',
        textAlign: 'center'
      }}>
        <h2 style={{
          fontSize: '36px',
          fontWeight: '800',
          color: '#ffffff',
          marginBottom: '20px'
        }}>
          Ready to Transform Your Safari Business?
        </h2>
        <p style={{
          fontSize: '18px',
          color: 'rgba(255, 255, 255, 0.9)',
          marginBottom: '40px'
        }}>
          Join safari companies across Africa using Reservation Safari
        </p>
        <button
          onClick={handleLogin}
          style={{
            background: '#ffffff',
            color: '#2ecc71',
            border: 'none',
            padding: '16px 40px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '700',
            transition: 'all 0.3s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px'
          }}
          onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        >
          Start Free Trial <ArrowRight size={20} />
        </button>
      </section>

      {/* Footer */}
      <footer style={{
        background: '#1a1a1a',
        color: '#aaaaaa',
        padding: '40px',
        textAlign: 'center',
        fontSize: '13px'
      }}>
        <p>© {new Date().getFullYear()} Reservation Safari. All rights reserved.</p>
      </footer>
    </div>
  );
}