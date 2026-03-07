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
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async () => {
    if (!email || !password) return setError('Email et mot de passe requis');
    setLoading(true);
    setError('');

    try {
      let result;
      if (isSignup) {
        result = await supabase.auth.signUp({ email, password });
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
      }

      if (result.error) throw result.error;
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#080808',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Montserrat, sans-serif',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=Montserrat:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input { background: transparent; color: #E8E0D0; outline: none; font-family: 'Montserrat', sans-serif; }
        input::placeholder { color: #333; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fadeIn 0.6s ease forwards; }
        .btn-gold:hover { background: #B8933B !important; transform: translateY(-1px); }
      `}</style>

      <div className="animate-in" style={{
        width: '100%', maxWidth: '420px', padding: '48px',
        border: '1px solid #1A1A1A', borderRadius: '8px',
        background: '#0D0D0D',
      }}>
        {/* LOGO */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
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

        {/* TITLE */}
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '28px', fontWeight: 300, color: '#E8E0D0',
          marginBottom: '8px', textAlign: 'center',
        }}>
          {isSignup ? 'Create your account' : 'Welcome back'}
        </div>
        <div style={{
          fontSize: '11px', color: '#333', letterSpacing: '1px',
          textAlign: 'center', marginBottom: '40px',
        }}>
          {isSignup ? 'Start building your authority' : 'Continue building your authority'}
        </div>

        {/* EMAIL */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '9px', letterSpacing: '3px', color: '#C9A84C', marginBottom: '8px' }}>
            EMAIL
          </div>
          <input
            type="email"
            placeholder="founder@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              width: '100%', padding: '14px 18px',
              border: '1px solid #1E1E1E', borderRadius: '4px',
              fontSize: '13px', letterSpacing: '1px',
            }}
            onFocus={e => e.target.style.borderColor = '#C9A84C44'}
            onBlur={e => e.target.style.borderColor = '#1E1E1E'}
          />
        </div>

        {/* PASSWORD */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '9px', letterSpacing: '3px', color: '#C9A84C', marginBottom: '8px' }}>
            PASSWORD
          </div>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAuth()}
            style={{
              width: '100%', padding: '14px 18px',
              border: '1px solid #1E1E1E', borderRadius: '4px',
              fontSize: '13px', letterSpacing: '1px',
            }}
            onFocus={e => e.target.style.borderColor = '#C9A84C44'}
            onBlur={e => e.target.style.borderColor = '#1E1E1E'}
          />
        </div>

        {/* ERROR */}
        {error && (
          <div style={{
            padding: '12px 16px', background: '#1A0000',
            border: '1px solid #3A0000', borderRadius: '4px',
            color: '#FF4444', fontSize: '11px', letterSpacing: '1px',
            marginBottom: '24px',
          }}>
            {error}
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
            marginBottom: '24px', transition: 'all 0.3s',
          }}
        >
          {loading ? 'LOADING...' : isSignup ? 'CREATE ACCOUNT →' : 'SIGN IN →'}
        </button>

        {/* TOGGLE */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => { setIsSignup(!isSignup); setError(''); }}
            style={{
              background: 'none', border: 'none', color: '#333',
              fontSize: '11px', fontFamily: 'Montserrat',
              cursor: 'pointer', letterSpacing: '1px',
            }}
          >
            {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}