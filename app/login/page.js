"use client";
import { useState } from 'react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = () => {
    setError('');
    if (!email || !/\S+@\S+\.\S+/.test(email)) return setError('Please enter a valid email address');
    setLoading(true);
    localStorage.setItem('ghostsaas_email', email);
    window.location.href = '/dashboard';
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#FAFAF8',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Montserrat, sans-serif', padding: '24px',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Montserrat:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input { background: transparent; color: #1A1208; outline: none; font-family: 'Montserrat', sans-serif; width: 100%; }
        input::placeholder { color: #C4B99A; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-in { animation: fadeIn 0.6s ease forwards; }
        .btn-gold {
          background: linear-gradient(135deg, #D4AF37 0%, #C9A84C 50%, #A07820 100%);
          background-size: 200% auto;
          box-shadow: 0 4px 20px rgba(201,168,76,0.3), inset 0 1px 0 rgba(255,255,255,0.2);
          transition: all 0.4s ease;
          position: relative; overflow: hidden;
        }
        .btn-gold::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
        }
        .btn-gold:hover { box-shadow: 0 8px 36px rgba(201,168,76,0.45); transform: translateY(-2px); }
      `}</style>

      <div className="animate-in" style={{
        width: '100%', maxWidth: '420px',
        background: '#FFFFFF',
        border: '1px solid #EDE8DE',
        borderRadius: '20px',
        boxShadow: '0 8px 40px rgba(26,18,8,0.08)',
        overflow: 'hidden',
      }}>
        <div style={{ height: '4px', background: 'linear-gradient(90deg, #D4AF37, #C9A84C, #A07820)' }} />

        <div style={{ padding: '48px' }}>

          {/* LOGO */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #D4AF37, #A07820)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', color: '#FFF',
              boxShadow: '0 4px 16px rgba(201,168,76,0.35)',
              margin: '0 auto 16px',
            }}>◈</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', fontWeight: 600, letterSpacing: '2px', color: '#1A1208' }}>
              GHOST<span style={{ color: '#C9A84C' }}>SAAS</span>
            </div>
            <div style={{ fontSize: '8px', letterSpacing: '3px', color: '#C4B99A', fontFamily: 'Montserrat', marginTop: '4px' }}>
              AUTHORITY ENGINE
            </div>
          </div>

          {/* TITLE */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '28px', fontWeight: 400, color: '#1A1208', marginBottom: '8px' }}>
              Welcome
            </div>
            <div style={{ fontSize: '12px', color: '#A09070', fontFamily: 'Montserrat', fontWeight: 300, letterSpacing: '0.5px' }}>
              Enter your email to access your dashboard
            </div>
          </div>

          {/* EMAIL */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '9px', letterSpacing: '3px', color: '#A09070', marginBottom: '8px', fontFamily: 'Montserrat', fontWeight: 600 }}>
              EMAIL ADDRESS
            </label>
            <div style={{ border: '1px solid #EDE8DE', borderRadius: '10px', padding: '14px 16px', background: '#FDFCF9' }}>
              <input
                type="email"
                placeholder="founder@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{ fontSize: '14px' }}
              />
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div style={{
              padding: '12px 16px', background: '#FFF8F8',
              border: '1px solid #FF444422', borderRadius: '10px',
              color: '#CC3333', fontSize: '11px',
              marginBottom: '20px', fontFamily: 'Montserrat',
            }}>
              ⚠ {error}
            </div>
          )}

          {/* BUTTON */}
          <button onClick={handleLogin} disabled={loading} className="btn-gold" style={{
            width: '100%', padding: '16px', border: 'none', borderRadius: '12px',
            color: '#2A1800', fontSize: '10px', letterSpacing: '3px',
            fontFamily: 'Montserrat', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <span style={{
                  display: 'inline-block', width: '14px', height: '14px',
                  border: '2px solid rgba(42,24,0,0.2)', borderTop: '2px solid #2A1800',
                  borderRadius: '50%', animation: 'spin 1s linear infinite',
                }} />
                LOADING...
              </span>
            ) : 'ACCESS MY DASHBOARD →'}
          </button>

          <p style={{ fontSize: '10px', color: '#C4B99A', textAlign: 'center', marginTop: '20px', lineHeight: 1.6, fontFamily: 'Montserrat' }}>
            No password required · Your vault is private
          </p>
        </div>
      </div>
    </div>
  );
}