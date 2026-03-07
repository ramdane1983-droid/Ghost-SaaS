"use client";
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://zynnnyxmwbgzbatphpjh.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5bm5ueXhtd2JnemJhdHBocGpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDk1MzYsImV4cCI6MjA4NzY4NTUzNn0.qCycJ1lej56BMO1Akti2qbPuVi1D1bGYptpskju8vPM"
);

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getPasswordStrength = (pwd) => {
    if (pwd.length === 0) return { score: 0, label: '', color: '#E8E4DC' };
    if (pwd.length < 6) return { score: 1, label: 'TOO SHORT', color: '#FF4444' };
    if (pwd.length < 8) return { score: 2, label: 'WEAK', color: '#FF8C00' };
    if (!/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return { score: 3, label: 'MEDIUM', color: '#FFD700' };
    return { score: 4, label: 'STRONG', color: '#C9A84C' };
  };

  const strength = getPasswordStrength(password);

  const handleAuth = async () => {
    setError('');
    if (!email || !password) return setError('Email and password are required');
    if (!/\S+@\S+\.\S+/.test(email)) return setError('Please enter a valid email address');
    if (isSignup) {
      if (password.length < 8) return setError('Password must be at least 8 characters');
      if (!/[A-Z]/.test(password)) return setError('Password must contain at least one uppercase letter');
      if (!/[0-9]/.test(password)) return setError('Password must contain at least one number');
      if (password !== confirmPassword) return setError('Passwords do not match');
    }
    setLoading(true);
    try {
      if (isSignup) {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        window.location.href = '/dashboard';
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = '/dashboard';
      }
    } catch (err) {
      if (err.message.includes('Email not confirmed')) {
        setError('Please try again — account created, just sign in now');
      } else if (err.message.includes('Invalid login credentials')) {
        setError('Invalid email or password');
      } else if (err.message.includes('User already registered')) {
        setError('An account with this email already exists — sign in instead');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
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
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
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
        .tab-active { background: #C9A84C !important; color: #2A1800 !important; }
        .tab-inactive { background: transparent !important; color: #A09070 !important; }
        .tab-inactive:hover { background: #F5F2EC !important; }
      `}</style>

      <div className="animate-in" style={{
        width: '100%', maxWidth: '440px',
        background: '#FFFFFF',
        border: '1px solid #EDE8DE',
        borderRadius: '20px',
        boxShadow: '0 8px 40px rgba(26,18,8,0.08)',
        overflow: 'hidden',
      }}>

        {/* GOLD TOP BAR */}
        <div style={{ height: '4px', background: 'linear-gradient(90deg, #D4AF37, #C9A84C, #A07820)' }} />

        <div style={{ padding: '48px' }}>

          {/* LOGO */}
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
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

          {/* TABS */}
          <div style={{
            display: 'flex', background: '#F5F2EC',
            border: '1px solid #EDE8DE', borderRadius: '10px',
            padding: '4px', marginBottom: '32px', gap: '4px',
          }}>
            {['SIGN IN', 'CREATE ACCOUNT'].map((tab, i) => (
              <button key={tab} onClick={() => { setIsSignup(i === 1); setError(''); }}
                className={isSignup === (i === 1) ? 'tab-active' : 'tab-inactive'}
                style={{
                  flex: 1, padding: '10px', border: 'none', borderRadius: '7px',
                  fontSize: '9px', letterSpacing: '2px',
                  fontFamily: 'Montserrat', fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}>
                {tab}
              </button>
            ))}
          </div>

          {/* FIELDS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '24px' }}>

            {/* EMAIL */}
            <div>
              <label style={{ display: 'block', fontSize: '9px', letterSpacing: '3px', color: '#A09070', marginBottom: '8px', fontFamily: 'Montserrat', fontWeight: 600 }}>
                EMAIL ADDRESS
              </label>
              <div style={{ border: '1px solid #EDE8DE', borderRadius: '10px', padding: '13px 16px', background: '#FDFCF9', transition: 'border-color 0.2s' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#C9A84C'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#EDE8DE'}>
                <input type="email" placeholder="founder@company.com" value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ fontSize: '13px' }} />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <label style={{ display: 'block', fontSize: '9px', letterSpacing: '3px', color: '#A09070', marginBottom: '8px', fontFamily: 'Montserrat', fontWeight: 600 }}>
                PASSWORD
              </label>
              <div style={{ border: '1px solid #EDE8DE', borderRadius: '10px', padding: '13px 16px', background: '#FDFCF9' }}>
                <input type="password"
                  placeholder={isSignup ? "Min. 8 chars, 1 uppercase, 1 number" : "••••••••"}
                  value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAuth()}
                  style={{ fontSize: '13px' }} />
              </div>
              {isSignup && password.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <div style={{ display: 'flex', gap: '3px', flex: 1 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{
                        flex: 1, height: '3px', borderRadius: '2px',
                        background: i <= strength.score ? strength.color : '#EDE8DE',
                        transition: 'background 0.3s',
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '9px', letterSpacing: '2px', color: strength.color, fontFamily: 'Montserrat', fontWeight: 600 }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            {/* CONFIRM PASSWORD */}
            {isSignup && (
              <div>
                <label style={{ display: 'block', fontSize: '9px', letterSpacing: '3px', color: '#A09070', marginBottom: '8px', fontFamily: 'Montserrat', fontWeight: 600 }}>
                  CONFIRM PASSWORD
                </label>
                <div style={{
                  border: `1px solid ${confirmPassword && confirmPassword !== password ? '#FF444433' : '#EDE8DE'}`,
                  borderRadius: '10px', padding: '13px 16px', background: '#FDFCF9',
                }}>
                  <input type="password" placeholder="••••••••"
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAuth()}
                    style={{ fontSize: '13px' }} />
                </div>
                {confirmPassword && confirmPassword === password && (
                  <div style={{ fontSize: '9px', color: '#C9A84C', letterSpacing: '2px', marginTop: '6px', fontFamily: 'Montserrat', fontWeight: 600 }}>
                    ✓ PASSWORDS MATCH
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ERROR */}
          {error && (
            <div style={{
              padding: '12px 16px', background: '#FFF8F8',
              border: '1px solid #FF444422', borderRadius: '10px',
              color: '#CC3333', fontSize: '11px', letterSpacing: '0.5px',
              marginBottom: '20px', lineHeight: 1.5, fontFamily: 'Montserrat',
            }}>
              ⚠ {error}
            </div>
          )}

          {/* BUTTON */}
          <button onClick={handleAuth} disabled={loading} className="btn-gold" style={{
            width: '100%', padding: '16px', border: 'none', borderRadius: '12px',
            color: '#2A1800', fontSize: '10px', letterSpacing: '3px',
            fontFamily: 'Montserrat', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '20px',
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
            ) : isSignup ? 'CREATE MY ACCOUNT →' : 'SIGN IN →'}
          </button>

          {/* TERMS */}
          {isSignup && (
            <p style={{ fontSize: '10px', color: '#C4B99A', textAlign: 'center', lineHeight: 1.6, fontFamily: 'Montserrat' }}>
              By creating an account you agree to our Terms of Service and Privacy Policy
            </p>
          )}
        </div>
      </div>
    </div>
  );
}