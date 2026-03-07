"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://zynnnyxmwbgzbatphpjh.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5bm5ueXhtd2JnemJhdHBocGpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjEwOTUzNiwiZXhwIjoyMDg3Njg1NTM2fQ.Z2WF1be5gp00z1w5wtZppv4832m8RKws-87Ju4pw1rM"
);

const ANGLE_CONFIG = {
  rant: { label: 'THE RANT', icon: '⚡', color: '#B8963E', description: 'Provocateur · Contrarian' },
  lesson: { label: 'THE LESSON', icon: '📖', color: '#7A9BB5', description: 'Éducatif · Actionnable' },
  vision: { label: 'THE VISION', icon: '🔭', color: '#9B8EC4', description: 'Visionnaire · Inspirant' },
};

export default function Dashboard() {
  const [email, setEmail] = useState('');
  const [userSession, setUserSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [angles, setAngles] = useState(null);
  const [saved, setSaved] = useState({});
  const [copied, setCopied] = useState('');
  const [history, setHistory] = useState([]);
  const [creditsRemaining, setCreditsRemaining] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [activeAngle, setActiveAngle] = useState('rant');
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }
      setUserSession(session);
      setEmail(session.user.email);
      setAuthLoading(false);
      fetchHistory(session.user.email);
    };
    checkSession();
  }, []);

  if (authLoading) return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F5F2ED 0%, #EDE8E0 50%, #F0EDE6 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#B8963E', fontFamily: 'Georgia, serif', fontSize: '13px', letterSpacing: '4px',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '28px', marginBottom: '16px', opacity: 0.6 }}>◈</div>
        LOADING...
      </div>
    </div>
  );

  const fetchHistory = async (userEmail) => {
    const emailToUse = userEmail || email;
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('email', emailToUse)
      .order('created_at', { ascending: false });
    setHistory(data || []);
  };

  const handleUpload = async () => {
    if (!file) return alert("Sélectionne un fichier audio ou vidéo");
    setLoading(true);
    setAngles(null);
    setTranscript('');
    setSaved({});

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase
        .storage.from('videos')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw new Error('Upload failed: ' + uploadError.message);

      const { data: urlData } = supabase.storage.from('videos').getPublicUrl(fileName);
      const fileUrl = urlData.publicUrl;

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl, email }),
      });

      const text = await res.text();
      if (!text) throw new Error("Réponse vide");
      const data = JSON.parse(text);
      if (data.error === 'NO_CREDITS') { setShowUpgradeModal(true); return; }
      if (!res.ok) throw new Error(data.error || data.message);
      setAngles(data.angles);
      setTranscript(data.transcript);
      setCreditsRemaining(data.credits_remaining);
      setActiveAngle('rant');
    } catch (err) {
      alert("Erreur : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    try {
      const res = await fetch('/api/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      alert("Erreur : " + err.message);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleSave = async (angleKey) => {
    const { error } = await supabase.from('posts').insert([{
      content_raw: transcript,
      content_ai: angles[angleKey],
      status: 'draft',
      narrative_type: angleKey,
      email: email,
    }]);
    if (!error) {
      setSaved(p => ({ ...p, [angleKey]: true }));
      await fetchHistory(email);
    }
  };

  const handleCopy = (angleKey) => {
    navigator.clipboard.writeText(angles[angleKey]);
    setCopied(angleKey);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #F7F4EF 0%, #EDE8DF 40%, #E8E2D8 100%)', color: '#2C2416' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400;1,500&family=Jost:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --gold: #B8963E;
          --gold-light: #D4AF5A;
          --gold-pale: #F0E6CC;
          --pearl: #F7F4EF;
          --pearl-dark: #EDE8DF;
          --text: #2C2416;
          --text-muted: #8C7B5E;
          --text-faint: #C4B49A;
          --border: #DDD5C4;
          --border-light: #EDE5D6;
          --white: #FDFBF8;
        }
        body { background: var(--pearl); }
        input, textarea { background: transparent; color: var(--text); outline: none; font-family: 'Jost', sans-serif; }
        input::placeholder { color: var(--text-faint); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--pearl-dark); }
        ::-webkit-scrollbar-thumb { background: var(--gold-pale); border-radius: 2px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.95); } }
        .fade-up { animation: fadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .fade-up-2 { animation: fadeUp 0.7s 0.1s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .fade-up-3 { animation: fadeUp 0.7s 0.2s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .btn-primary {
          background: linear-gradient(135deg, #C9A84C, #B8963E, #A07830);
          background-size: 200% auto;
          transition: all 0.4s ease;
          box-shadow: 0 4px 20px rgba(184,150,62,0.25), inset 0 1px 0 rgba(255,255,255,0.15);
        }
        .btn-primary:hover {
          background-position: right center;
          box-shadow: 0 8px 30px rgba(184,150,62,0.4), inset 0 1px 0 rgba(255,255,255,0.2);
          transform: translateY(-2px);
        }
        .btn-primary:disabled {
          background: var(--border);
          box-shadow: none;
          transform: none;
        }
        .btn-secondary {
          background: var(--white);
          border: 1px solid var(--border);
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .btn-secondary:hover {
          border-color: var(--gold);
          color: var(--gold) !important;
          box-shadow: 0 4px 16px rgba(184,150,62,0.15);
          transform: translateY(-1px);
        }
        .card {
          background: var(--white);
          border: 1px solid var(--border-light);
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(44,36,22,0.06), 0 1px 4px rgba(44,36,22,0.04);
        }
        .upload-zone {
          background: linear-gradient(135deg, var(--white), var(--pearl));
          border: 2px dashed var(--border);
          border-radius: 16px;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .upload-zone:hover, .upload-zone.drag-over {
          border-color: var(--gold);
          background: linear-gradient(135deg, #FDFAF4, var(--gold-pale));
          box-shadow: 0 8px 32px rgba(184,150,62,0.12);
        }
        .angle-tab {
          transition: all 0.25s ease;
          border-radius: 10px 10px 0 0;
        }
        .angle-tab:hover { background: var(--pearl) !important; }
        .vault-item {
          background: var(--white);
          border: 1px solid var(--border-light);
          border-radius: 12px;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(44,36,22,0.04);
        }
        .vault-item:hover {
          border-color: var(--gold);
          box-shadow: 0 8px 24px rgba(184,150,62,0.12);
          transform: translateY(-2px);
        }
        .gold-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--gold-light), transparent);
        }
        .texture-overlay {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
          pointer-events: none;
          position: fixed; inset: 0; z-index: 0;
        }
      `}</style>

      <div className="texture-overlay" />

      {/* HEADER */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(247,244,239,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-light)',
        boxShadow: '0 4px 24px rgba(44,36,22,0.06)',
      }}>
        <div style={{
          maxWidth: '1100px', margin: '0 auto',
          padding: '0 48px', height: '72px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* LOGO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #C9A84C, #A07830)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(184,150,62,0.3)',
              fontSize: '16px',
            }}>◈</div>
            <div>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '18px', fontWeight: 700, letterSpacing: '1px',
                color: '#2C2416',
              }}>
                Ghost<span style={{ color: '#B8963E' }}>SaaS</span>
              </div>
              <div style={{ fontSize: '9px', letterSpacing: '3px', color: 'var(--text-faint)', fontFamily: 'Jost' }}>
                AUTHORITY ENGINE
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {creditsRemaining !== null && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 14px',
                background: 'linear-gradient(135deg, #FDF8EC, #F5EDD4)',
                border: '1px solid #E8D9A8',
                borderRadius: '20px',
              }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#B8963E', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: '11px', letterSpacing: '1px', color: '#8C6A2E', fontFamily: 'Jost', fontWeight: 500 }}>
                  {creditsRemaining} credits
                </span>
              </div>
            )}
            <div style={{
              fontSize: '12px', color: 'var(--text-muted)',
              fontFamily: 'Jost', maxWidth: '180px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {email}
            </div>
            <button
              onClick={handleLogout}
              className="btn-secondary"
              style={{
                padding: '8px 18px', borderRadius: '8px',
                color: 'var(--text-muted)', fontSize: '11px',
                letterSpacing: '1px', fontFamily: 'Jost',
                fontWeight: 500, cursor: 'pointer',
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '820px', margin: '0 auto', padding: '60px 24px 120px' }}>

        {/* HERO */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }} className="fade-up">
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 16px',
            background: 'linear-gradient(135deg, #FDF8EC, #F5EDD4)',
            border: '1px solid #E8D9A8',
            borderRadius: '20px', marginBottom: '24px',
          }}>
            <span style={{ fontSize: '10px', letterSpacing: '3px', color: '#8C6A2E', fontFamily: 'Jost', fontWeight: 600 }}>
              ✦ YOUR AUTHORITY ENGINE
            </span>
          </div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '52px', fontWeight: 500, lineHeight: 1.15,
            color: '#2C2416', marginBottom: '16px',
          }}>
            Transform Your Voice<br />
            <em style={{
              background: 'linear-gradient(135deg, #C9A84C, #8C6A2E)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Into Authority</em>
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', fontFamily: 'Jost', fontWeight: 300, lineHeight: 1.6 }}>
            Upload a call. Receive three strategic angles. Dominate LinkedIn.
          </p>
        </div>

        {/* UPLOAD CARD */}
        <div className="card fade-up-2" style={{ padding: '40px', marginBottom: '24px' }}>

          {/* UPLOAD ZONE */}
          <div
            className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
            style={{ padding: '48px 32px', textAlign: 'center', marginBottom: '28px' }}
            onClick={() => document.getElementById('file-upload').click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              accept="video/*,audio/*,.mp4,.mov,.mp3,.wav,.m4a,.webm"
              onChange={e => setFile(e.target.files[0])}
              style={{ display: 'none' }}
            />
            <div style={{
              width: '64px', height: '64px', borderRadius: '16px',
              background: file
                ? 'linear-gradient(135deg, #C9A84C, #A07830)'
                : 'linear-gradient(135deg, #F0E6CC, #E8D9A8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: file ? '0 8px 24px rgba(184,150,62,0.3)' : 'none',
              fontSize: '28px', transition: 'all 0.3s',
            }}>
              {file ? '✓' : '🎙'}
            </div>
            <div style={{
              fontSize: '15px', fontFamily: "'Playfair Display', serif",
              color: file ? '#B8963E' : '#2C2416',
              marginBottom: '8px', fontWeight: 500,
            }}>
              {file ? file.name : 'Drop your Zoom call or voice memo'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-faint)', fontFamily: 'Jost', letterSpacing: '1px' }}>
              {file ? (
                <span style={{ color: '#B8963E', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                  Remove file
                </span>
              ) : 'MP4 · MOV · MP3 · WAV · M4A · WEBM — Click or drag & drop'}
            </div>
          </div>

          {/* BUTTON */}
          <button
            onClick={handleUpload}
            disabled={loading || !file}
            className="btn-primary"
            style={{
              width: '100%', padding: '18px',
              border: 'none', borderRadius: '12px',
              color: '#FFF8EC',
              fontSize: '12px', letterSpacing: '3px',
              fontFamily: 'Jost', fontWeight: 600,
              cursor: loading || !file ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <span style={{
                  display: 'inline-block', width: '16px', height: '16px',
                  border: '2px solid rgba(255,248,236,0.3)', borderTop: '2px solid #FFF8EC',
                  borderRadius: '50%', animation: 'spin 1s linear infinite',
                }} />
                ANALYZING YOUR GENIUS...
              </span>
            ) : 'EXTRACT 3 STRATEGIC ANGLES →'}
          </button>
        </div>

        {/* TRANSCRIPT */}
        {transcript && (
          <div className="card fade-up" style={{ padding: '28px 32px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '3px', height: '20px', background: 'linear-gradient(180deg, #C9A84C, #A07830)', borderRadius: '2px' }} />
              <span style={{ fontSize: '10px', letterSpacing: '3px', color: '#B8963E', fontFamily: 'Jost', fontWeight: 600 }}>
                TRANSCRIPT
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.8, fontFamily: 'Jost', fontWeight: 300 }}>
              {transcript}
            </p>
          </div>
        )}

        {/* 3 ANGLES */}
        {angles && (
          <div style={{ marginBottom: '80px' }} className="fade-up">
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ fontSize: '10px', letterSpacing: '4px', color: '#B8963E', fontFamily: 'Jost', fontWeight: 600, marginBottom: '12px' }}>
                ✦ YOUR THREE ANGLES ✦
              </div>
              <div className="gold-divider" style={{ maxWidth: '200px', margin: '0 auto' }} />
            </div>

            {/* TABS */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '-1px', position: 'relative', zIndex: 1 }}>
              {Object.entries(ANGLE_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setActiveAngle(key)}
                  className="angle-tab"
                  style={{
                    flex: 1, padding: '14px 8px',
                    background: activeAngle === key ? '#FDFBF8' : 'transparent',
                    border: activeAngle === key ? '1px solid var(--border-light)' : '1px solid transparent',
                    borderBottom: activeAngle === key ? '1px solid #FDFBF8' : '1px solid var(--border-light)',
                    color: activeAngle === key ? config.color : 'var(--text-faint)',
                    fontSize: '10px', letterSpacing: '2px',
                    fontFamily: 'Jost', fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {config.icon} {config.label}
                </button>
              ))}
            </div>

            {/* CONTENT */}
            <div className="card" style={{ borderRadius: '0 0 16px 16px', padding: '36px' }}>
              <div style={{
                display: 'inline-block', padding: '4px 12px',
                background: 'var(--pearl)', borderRadius: '20px',
                fontSize: '10px', color: 'var(--text-faint)',
                letterSpacing: '2px', fontFamily: 'Jost',
                marginBottom: '20px',
              }}>
                {ANGLE_CONFIG[activeAngle].description}
              </div>
              <p style={{
                fontSize: '15px', lineHeight: 1.9, color: '#3C3020',
                fontFamily: "'Playfair Display', serif", fontWeight: 400,
                whiteSpace: 'pre-wrap', marginBottom: '28px',
              }}>
                {angles[activeAngle]}
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => handleCopy(activeAngle)}
                  className="btn-secondary"
                  style={{
                    flex: 1, padding: '13px',
                    borderRadius: '10px', color: 'var(--text-muted)',
                    fontSize: '11px', letterSpacing: '2px',
                    fontFamily: 'Jost', fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  {copied === activeAngle ? '✓ COPIED' : '⎘ COPY'}
                </button>
                <button
                  onClick={() => handleSave(activeAngle)}
                  disabled={saved[activeAngle]}
                  className="btn-primary"
                  style={{
                    flex: 1, padding: '13px',
                    border: 'none', borderRadius: '10px',
                    color: saved[activeAngle] ? 'var(--text-faint)' : '#FFF8EC',
                    fontSize: '11px', letterSpacing: '2px',
                    fontFamily: 'Jost', fontWeight: 600,
                    cursor: saved[activeAngle] ? 'default' : 'pointer',
                    background: saved[activeAngle] ? 'var(--border)' : undefined,
                    boxShadow: saved[activeAngle] ? 'none' : undefined,
                  }}
                >
                  {saved[activeAngle] ? '✓ ARCHIVED' : '◈ ARCHIVE'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VAULT */}
        <div className="fade-up-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <span style={{ fontSize: '16px', fontFamily: "'Playfair Display', serif", fontWeight: 500, color: '#2C2416' }}>
              The Vault
            </span>
            <div className="gold-divider" style={{ flex: 1 }} />
            <span style={{
              padding: '3px 10px', background: 'var(--gold-pale)',
              borderRadius: '20px', fontSize: '10px',
              color: '#8C6A2E', fontFamily: 'Jost', fontWeight: 600,
            }}>
              {history.length} pieces
            </span>
          </div>

          {history.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '64px 32px',
              background: 'var(--white)', border: '2px dashed var(--border)',
              borderRadius: '16px',
            }}>
              <div style={{ fontSize: '40px', marginBottom: '16px', opacity: 0.3 }}>◈</div>
              <div style={{ fontSize: '14px', fontFamily: "'Playfair Display', serif", color: 'var(--text-muted)', marginBottom: '8px' }}>
                Your vault awaits
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-faint)', fontFamily: 'Jost', fontWeight: 300 }}>
                Upload your first call to begin building your authority archive
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {history.map((post) => (
                <div key={post.id} className="vault-item" style={{ padding: '24px 28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <span style={{
                      padding: '3px 10px',
                      background: 'linear-gradient(135deg, #FDF8EC, #F5EDD4)',
                      border: '1px solid #E8D9A8',
                      borderRadius: '20px',
                      fontSize: '10px', letterSpacing: '2px',
                      color: ANGLE_CONFIG[post.narrative_type]?.color || '#B8963E',
                      fontFamily: 'Jost', fontWeight: 600,
                    }}>
                      {ANGLE_CONFIG[post.narrative_type]?.icon} {ANGLE_CONFIG[post.narrative_type]?.label || post.narrative_type?.toUpperCase()}
                    </span>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-faint)', fontFamily: 'Jost' }}>
                      {new Date(post.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <p style={{
                    fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.7,
                    fontFamily: "'Playfair Display', serif", fontWeight: 400,
                  }}>
                    {post.content_ai?.substring(0, 220)}...
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* UPGRADE MODAL */}
      {showUpgradeModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(44,36,22,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(12px)',
        }}>
          <div className="card fade-up" style={{
            padding: '56px 48px', maxWidth: '460px',
            width: '90%', textAlign: 'center',
            background: 'linear-gradient(160deg, #FDFBF8, #F5F0E8)',
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #C9A84C, #A07830)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px', fontSize: '24px',
              boxShadow: '0 8px 24px rgba(184,150,62,0.3)',
            }}>✦</div>
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '30px', fontWeight: 500, color: '#2C2416',
              marginBottom: '12px', lineHeight: 1.2,
            }}>
              Your free genius<br /><em style={{ color: '#B8963E' }}>is exhausted.</em>
            </h2>
            <p style={{
              fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'Jost',
              fontWeight: 300, marginBottom: '32px', lineHeight: 1.7,
            }}>
              Unlock unlimited authority content.<br />
              Join the founders building their empire on LinkedIn.
            </p>
            <div style={{
              padding: '20px', background: 'var(--gold-pale)',
              borderRadius: '12px', marginBottom: '28px',
              border: '1px solid #E8D9A8',
            }}>
              <div style={{
                fontSize: '40px', color: '#B8963E',
                fontFamily: "'Playfair Display', serif", fontWeight: 700,
              }}>
                $49
                <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontFamily: 'Jost', fontWeight: 300 }}> / month</span>
              </div>
              <div style={{ fontSize: '11px', color: '#8C6A2E', fontFamily: 'Jost', letterSpacing: '1px', marginTop: '4px' }}>
                Unlimited transcriptions · Full vault access
              </div>
            </div>
            <button
              onClick={handleUpgrade}
              disabled={upgradeLoading}
              className="btn-primary"
              style={{
                width: '100%', padding: '16px',
                border: 'none', borderRadius: '12px',
                color: '#FFF8EC',
                fontSize: '11px', letterSpacing: '3px',
                fontFamily: 'Jost', fontWeight: 600,
                cursor: 'pointer', marginBottom: '14px',
              }}
            >
              {upgradeLoading ? 'REDIRECTING...' : 'UPGRADE TO PRO →'}
            </button>
            <button
              onClick={() => setShowUpgradeModal(false)}
              style={{
                background: 'none', border: 'none',
                color: 'var(--text-faint)', fontSize: '12px',
                fontFamily: 'Jost', cursor: 'pointer', letterSpacing: '1px',
              }}
            >
              maybe later
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid var(--border-light)',
        padding: '28px 48px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(247,244,239,0.8)',
      }}>
        <div style={{ fontSize: '10px', letterSpacing: '2px', color: 'var(--text-faint)', fontFamily: 'Jost' }}>
          GHOSTSAAS © 2026
        </div>
        <div className="gold-divider" style={{ flex: 1, margin: '0 24px' }} />
        <div style={{ fontSize: '10px', letterSpacing: '2px', color: 'var(--text-faint)', fontFamily: 'Jost' }}>
          AUTHORITY INTELLIGENCE
        </div>
      </footer>
    </div>
  );
}