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
    if (pwd.length === 0) return { score: 0, label: '', color: '#1A1A1A' };
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
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;

        // Auto sign in after signup
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        window.location.href = '/dashboard';

      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = '/dashboard';
      }
    } catch (err) {
      if (err.message.includes('Email not confirmed')) {
        setError('Please confirm your email before signing in');
      } else if (err.message.includes('Invalid login credentials')) {
        setError('Invalid email or password');
      } else if (err.message.includes('User already registered')) {
        setError('An account with this email already exists');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#080808',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Montserrat, sans-serif', padding: '24px',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=Montserrat:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input { background: transparent; color: #E8E0D0; outline: none; font-family: 'Montserrat', sans-serif; width: 100%; }
        input::placeholder { color: #333; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-in { animation: fadeIn 0.6s ease forwards; }
        .btn-gold:hover { background: #B8933B !important; transform: translateY(-1px); }
      `}</style>

      <div className="animate-in" style={{
        width: '100%', maxWidth: '440px',
        border: '1px solid #1A1A1A', borderRadius: '8px',
        background: '#0D0D0D', overflow: 'hidden',
      }}>

        {/* TOP BAR */}
        <div style={{
          background: '#C9A84C', padding: '3px',
          display: 'flex', gap: '2px',
        }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ flex: 1, height: '2px', background: i <= strength.score ? '#080808' : '#C9A84C44' }} />
          ))}
        </div>

        <div style={{ padding: '48px' }}>

          {/* LOGO */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '28px', fontWeight: 300, letterSpacing: '4px', color: '#C9A84C',
            }}>
              GHOST<span style={{ color: '#E8E0D0' }}>SAAS</span>
            </div>
            <div style={{ fontSize: '9px', letterSpacing: '3px', color: '#333', marginTop: '4px' }}>
              AUTHORITY INTELLIGENCE
            </div>
          </div>

          {/* TABS */}
          <div style={{
            display: 'flex', background: '#0A0A0A',
            border: '1px solid #1A1A1A', borderRadius: '4px',
            padding: '4px', marginBottom: '36px', gap: '4px',
          }}>
            {['SIGN IN', 'CREATE ACCOUNT'].map((tab, i) => (
              <button
                key={tab}
                onClick={() => { setIsSignup(i === 1); setError(''); }}
                style={{
                  flex: 1, padding: '10px',
                  background: isSignup === (i === 1) ? '#C9A84C' : 'transparent',
                  border: 'none', borderRadius: '3px',
                  color: isSignup === (i === 1) ? '#080808' : '#333',
                  fontSize: '9px', letterSpacing: '2px',
                  fontFamily: 'Montserrat', fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* FIELDS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>

            {/* EMAIL */}
            <div>
              <label style={{ display: 'block', fontSize: '9px', letterSpacing: '3px', color: '#444', marginBottom: '8px' }}>
                EMAIL ADDRESS
              </label>
              <div style={{ border: '1px solid #1E1E1E', borderRadius: '4px', padding: '14px 18px' }}>
                <input
                  type="email"
                  placeholder="founder@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ fontSize: '13px', letterSpacing: '0.5px' }}
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <label style={{ display: 'block', fontSize: '9px', letterSpacing: '3px', color: '#444', marginBottom: '8px' }}>
                PASSWORD
              </label>
              <div style={{ border: '1px solid #1E1E1E', borderRadius: '4px', padding: '14px 18px' }}>
                <input
                  type="password"
                  placeholder={isSignup ? "Min. 8 characters, 1 uppercase, 1 number" : "••••••••"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAuth()}
                  style={{ fontSize: '13px', letterSpacing: '0.5px' }}
                />
              </div>
              {isSignup && password.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <div style={{ display: 'flex', gap: '3px', flex: 1 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{
                        flex: 1, height: '2px', borderRadius: '1px',
                        background: i <= strength.score ? strength.color : '#1A1A1A',
                        transition: 'background 0.3s',
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '9px', letterSpacing: '2px', color: strength.color, fontFamily: 'Montserrat' }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            {/* CONFIRM PASSWORD */}
            {isSignup && (
              <div>
                <label style={{ display: 'block', fontSize: '9px', letterSpacing: '3px', color: '#444', marginBottom: '8px' }}>
                  CONFIRM PASSWORD
                </label>
                <div style={{
                  border: `1px solid ${confirmPassword && confirmPassword !== password ? '#FF444444' : '#1E1E1E'}`,
                  borderRadius: '4px', padding: '14px 18px',
                }}>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAuth()}
                    style={{ fontSize: '13px', letterSpacing: '0.5px' }}
                  />
                </div>
                {confirmPassword && confirmPassword === password && (
                  <div style={{ fontSize: '9px', color: '#C9A84C', letterSpacing: '2px', marginTop: '6px' }}>
                    ✓ PASSWORDS MATCH
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ERROR */}
          {error && (
            <div style={{
              padding: '12px 16px', background: '#1A000044',
              border: '1px solid #FF444433', borderRadius: '4px',
              color: '#FF6666', fontSize: '11px', letterSpacing: '0.5px',
              marginBottom: '20px', lineHeight: 1.5,
            }}>
              ⚠ {error}
            </div>
          )}

          {/* BUTTON */}
          <button
            onClick={handleAuth}
            disabled={loading}
            className="btn-gold"
            style={{
              width: '100%', padding: '16px',
              background: loading ? '#1A1A1A' : '#C9A84C',
              border: 'none', borderRadius: '4px',
              color: loading ? '#444' : '#080808',
              fontSize: '10px', letterSpacing: '3px',
              fontFamily: 'Montserrat', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <span style={{
                  display: 'inline-block', width: '12px', height: '12px',
                  border: '2px solid #C9A84C44', borderTop: '2px solid #C9A84C',
                  borderRadius: '50%', animation: 'spin 1s linear infinite',
                }} />
                LOADING...
              </span>
            ) : isSignup ? 'CREATE MY ACCOUNT →' : 'SIGN IN →'}
          </button>

          {/* TERMS */}
          {isSignup && (
            <p style={{
              fontSize: '10px', color: '#222', textAlign: 'center',
              marginTop: '16px', lineHeight: 1.6, letterSpacing: '0.5px',
            }}>
              By creating an account you agree to our<br />
              <span style={{ color: '#333' }}>Terms of Service</span> and <span style={{ color: '#333' }}>Privacy Policy</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}