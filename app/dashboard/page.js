"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://zynnnyxmwbgzbatphpjh.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5bm5ueXhtd2JnemJhdHBocGpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjEwOTUzNiwiZXhwIjoyMDg3Njg1NTM2fQ.Z2WF1be5gp00z1w5wtZppv4832m8RKws-87Ju4pw1rM"
);

const ANGLE_CONFIG = {
  rant: { label: 'THE RANT', icon: '⚡', color: '#D4AF37', description: 'Provocateur · Contrarian' },
  lesson: { label: 'THE LESSON', icon: '📖', color: '#60A5FA', description: 'Éducatif · Actionnable' },
  vision: { label: 'THE VISION', icon: '🔭', color: '#A78BFA', description: 'Visionnaire · Inspirant' },
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
      minHeight: '100vh', background: '#FFFFFF',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          border: '3px solid #F0F0F0', borderTop: '3px solid #D4AF37',
          animation: 'spin 1s linear infinite', margin: '0 auto 16px',
        }} />
        <div style={{ fontSize: '11px', letterSpacing: '4px', color: '#D4AF37', fontFamily: 'system-ui' }}>LOADING</div>
      </div>
    </div>
  );

  const fetchHistory = async (userEmail) => {
    const emailToUse = userEmail || email;
    const { data } = await supabase
      .from('posts').select('*')
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
      const { error: uploadError } = await supabase.storage.from('videos')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw new Error('Upload failed: ' + uploadError.message);
      const { data: urlData } = supabase.storage.from('videos').getPublicUrl(fileName);
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: urlData.publicUrl, email }),
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
    <div style={{ minHeight: '100vh', background: '#FAFAFA', color: '#0A0A0A', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Syne:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #FAFAFA; }
        input { background: transparent; color: #0A0A0A; outline: none; font-family: 'Inter', sans-serif; width: 100%; }
        input::placeholder { color: #BDBDBD; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes goldShimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(212,175,55,0.3); }
          50% { box-shadow: 0 0 40px rgba(212,175,55,0.6); }
        }
        .fade-up { animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .fade-up-2 { animation: fadeUp 0.8s 0.12s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .fade-up-3 { animation: fadeUp 0.8s 0.24s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .btn-gold {
          background: linear-gradient(135deg, #F5D060 0%, #D4AF37 40%, #A07820 100%);
          box-shadow: 0 4px 24px rgba(212,175,55,0.35), 0 1px 0 rgba(255,255,255,0.3) inset;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative; overflow: hidden;
        }
        .btn-gold::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%);
          background-size: 200% auto;
          animation: goldShimmer 3s linear infinite;
        }
        .btn-gold:hover {
          box-shadow: 0 8px 40px rgba(212,175,55,0.55), 0 1px 0 rgba(255,255,255,0.3) inset;
          transform: translateY(-2px);
        }
        .btn-gold:disabled {
          background: #E5E5E5;
          box-shadow: none;
          transform: none;
        }
        .btn-outline {
          background: #FFFFFF;
          border: 1.5px solid #E5E5E5;
          transition: all 0.25s ease;
        }
        .btn-outline:hover {
          border-color: #D4AF37;
          color: #D4AF37 !important;
          box-shadow: 0 4px 20px rgba(212,175,55,0.15);
          transform: translateY(-1px);
        }
        .glass-card {
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.8);
          box-shadow: 0 8px 32px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04);
          border-radius: 20px;
        }
        .glass-card-dark {
          background: #0A0A0A;
          border: 1px solid #1A1A1A;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
          border-radius: 20px;
        }
        .upload-zone {
          border: 2px dashed #E5E5E5;
          border-radius: 16px;
          background: #FFFFFF;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
        }
        .upload-zone:hover, .upload-zone.drag-over {
          border-color: #D4AF37;
          background: linear-gradient(135deg, #FFFDF5, #FFF8DC);
          box-shadow: 0 0 0 4px rgba(212,175,55,0.1);
        }
        .tab-btn { transition: all 0.2s ease; }
        .tab-btn:hover { background: #F5F5F5 !important; }
        .vault-card {
          background: #FFFFFF;
          border: 1px solid #F0F0F0;
          border-radius: 16px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .vault-card:hover {
          border-color: #D4AF37;
          box-shadow: 0 12px 40px rgba(212,175,55,0.15);
          transform: translateY(-3px);
        }
        .gold-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, #D4AF37, transparent);
        }
        .badge-gold {
          background: linear-gradient(135deg, #FFF8DC, #FFF0A0);
          border: 1px solid rgba(212,175,55,0.3);
          border-radius: 100px;
          padding: 4px 12px;
          font-size: 10px;
          letter-spacing: 1px;
          color: #8C6A1A;
          font-family: 'Inter';
          font-weight: 600;
        }
        .neon-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #D4AF37;
          box-shadow: 0 0 8px rgba(212,175,55,0.8), 0 0 16px rgba(212,175,55,0.4);
          animation: pulse 2s infinite;
        }
        /* Background grid */
        .bg-grid {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(212,175,55,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(212,175,55,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        /* Orb */
        .bg-orb {
          position: fixed; border-radius: 50%; pointer-events: none; z-index: 0;
          filter: blur(100px);
        }
      `}</style>

      {/* BACKGROUND */}
      <div className="bg-grid" />
      <div className="bg-orb" style={{
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)',
        top: '-200px', right: '-200px',
      }} />
      <div className="bg-orb" style={{
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(96,165,250,0.05) 0%, transparent 70%)',
        bottom: '100px', left: '-100px',
      }} />

      {/* HEADER */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(250,250,250,0.8)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.8)',
      }}>
        <div style={{
          maxWidth: '1000px', margin: '0 auto', padding: '0 32px',
          height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* LOGO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #F5D060, #A07820)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', fontWeight: 700, color: '#FFF',
              boxShadow: '0 4px 12px rgba(212,175,55,0.4)',
              animation: 'glow 3s ease-in-out infinite',
            }}>G</div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '17px', fontWeight: 800, letterSpacing: '-0.3px', color: '#0A0A0A' }}>
                Ghost<span style={{
                  background: 'linear-gradient(135deg, #F5D060, #D4AF37)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>SaaS</span>
              </div>
              <div style={{ fontSize: '8px', letterSpacing: '3px', color: '#BDBDBD', fontFamily: 'Inter', fontWeight: 500 }}>
                AUTHORITY ENGINE
              </div>
            </div>
          </div>

          {/* RIGHT NAV */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {creditsRemaining !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div className="neon-dot" />
                <span className="badge-gold">{creditsRemaining} credits</span>
              </div>
            )}
            <span style={{ fontSize: '12px', color: '#9E9E9E', fontFamily: 'Inter', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email}
            </span>
            <button onClick={handleLogout} className="btn-outline" style={{
              padding: '7px 16px', borderRadius: '8px',
              fontSize: '12px', fontFamily: 'Inter', fontWeight: 500,
              color: '#666', cursor: 'pointer',
            }}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '780px', margin: '0 auto', padding: '56px 24px 120px', position: 'relative', zIndex: 1 }}>

        {/* HERO */}
        <div style={{ textAlign: 'center', marginBottom: '56px' }} className="fade-up">
          <div className="badge-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
            ✦ YOUR AUTHORITY ENGINE IS READY
          </div>
          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: '54px', fontWeight: 800,
            lineHeight: 1.05, letterSpacing: '-1.5px',
            color: '#0A0A0A', marginBottom: '16px',
          }}>
            Your Voice.<br />
            <span style={{
              background: 'linear-gradient(135deg, #F5D060 0%, #D4AF37 50%, #A07820 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Your Authority.</span>
          </h1>
          <p style={{ fontSize: '15px', color: '#9E9E9E', fontFamily: 'Inter', fontWeight: 400, lineHeight: 1.6 }}>
            Upload a call. Get 3 LinkedIn-ready angles. Done in 60 seconds.
          </p>
        </div>

        {/* UPLOAD CARD */}
        <div className="glass-card fade-up-2" style={{ padding: '36px', marginBottom: '20px' }}>

          {/* UPLOAD ZONE */}
          <div
            className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
            style={{ padding: '52px 32px', textAlign: 'center', marginBottom: '24px' }}
            onClick={() => document.getElementById('file-upload').click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input
              type="file" id="file-upload"
              accept="video/*,audio/*,.mp4,.mov,.mp3,.wav,.m4a,.webm"
              onChange={e => setFile(e.target.files[0])}
              style={{ display: 'none' }}
            />
            <div style={{
              width: '72px', height: '72px', borderRadius: '20px',
              background: file
                ? 'linear-gradient(135deg, #F5D060, #A07820)'
                : 'linear-gradient(135deg, #F5F5F5, #EBEBEB)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '32px',
              boxShadow: file ? '0 8px 32px rgba(212,175,55,0.4)' : '0 4px 12px rgba(0,0,0,0.06)',
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
              {file ? '✓' : '🎙'}
            </div>
            <div style={{
              fontSize: '16px', fontFamily: "'Syne', sans-serif", fontWeight: 600,
              color: file ? '#D4AF37' : '#0A0A0A', marginBottom: '8px',
            }}>
              {file ? file.name : 'Drop your recording here'}
            </div>
            <div style={{ fontSize: '12px', color: '#BDBDBD', fontFamily: 'Inter' }}>
              {file ? (
                <span style={{ color: '#D4AF37', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                  Remove file
                </span>
              ) : 'MP4 · MOV · MP3 · WAV · M4A — Click or drag & drop'}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleUpload}
            disabled={loading || !file}
            className="btn-gold"
            style={{
              width: '100%', padding: '18px',
              border: 'none', borderRadius: '14px',
              color: '#1A0F00',
              fontSize: '13px', letterSpacing: '2px',
              fontFamily: "'Syne', sans-serif", fontWeight: 700,
              cursor: loading || !file ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <span style={{
                  display: 'inline-block', width: '16px', height: '16px',
                  border: '2px solid rgba(26,15,0,0.2)', borderTop: '2px solid #1A0F00',
                  borderRadius: '50%', animation: 'spin 1s linear infinite',
                }} />
                ANALYZING YOUR GENIUS...
              </span>
            ) : 'EXTRACT 3 STRATEGIC ANGLES →'}
          </button>
        </div>

        {/* TRANSCRIPT */}
        {transcript && (
          <div className="glass-card fade-up" style={{ padding: '24px 28px', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ width: '3px', height: '18px', background: 'linear-gradient(180deg, #F5D060, #A07820)', borderRadius: '2px' }} />
              <span style={{ fontSize: '10px', letterSpacing: '3px', color: '#D4AF37', fontFamily: 'Inter', fontWeight: 600 }}>
                TRANSCRIPT
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.8, fontFamily: 'Inter', fontWeight: 400 }}>
              {transcript}
            </p>
          </div>
        )}

        {/* 3 ANGLES */}
        {angles && (
          <div style={{ marginBottom: '72px' }} className="fade-up">
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div className="badge-gold" style={{ display: 'inline-block', marginBottom: '12px' }}>
                ✦ YOUR THREE ANGLES
              </div>
              <div className="gold-line" />
            </div>

            {/* TABS */}
            <div style={{
              display: 'flex', gap: '4px',
              background: '#F5F5F5', padding: '4px',
              borderRadius: '14px 14px 0 0',
              border: '1px solid #F0F0F0', borderBottom: 'none',
            }}>
              {Object.entries(ANGLE_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setActiveAngle(key)}
                  className="tab-btn"
                  style={{
                    flex: 1, padding: '12px 8px',
                    background: activeAngle === key ? '#FFFFFF' : 'transparent',
                    border: 'none', borderRadius: '10px',
                    color: activeAngle === key ? config.color : '#9E9E9E',
                    fontSize: '10px', letterSpacing: '1.5px',
                    fontFamily: "'Syne', sans-serif", fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: activeAngle === key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {config.icon} {config.label}
                </button>
              ))}
            </div>

            {/* CONTENT */}
            <div className="glass-card" style={{ borderRadius: '0 0 20px 20px', padding: '32px' }}>
              <span style={{
                display: 'inline-block', padding: '4px 12px',
                background: '#F5F5F5', borderRadius: '100px',
                fontSize: '10px', color: '#9E9E9E',
                letterSpacing: '1.5px', fontFamily: 'Inter', fontWeight: 500,
                marginBottom: '20px',
              }}>
                {ANGLE_CONFIG[activeAngle].description}
              </span>
              <p style={{
                fontSize: '15px', lineHeight: 1.85, color: '#1A1A1A',
                fontFamily: 'Inter', fontWeight: 400,
                whiteSpace: 'pre-wrap', marginBottom: '28px',
              }}>
                {angles[activeAngle]}
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => handleCopy(activeAngle)} className="btn-outline" style={{
                  flex: 1, padding: '13px', borderRadius: '12px',
                  fontSize: '11px', letterSpacing: '2px',
                  fontFamily: "'Syne', sans-serif", fontWeight: 700,
                  color: '#666', cursor: 'pointer',
                }}>
                  {copied === activeAngle ? '✓ COPIED' : '⎘ COPY'}
                </button>
                <button
                  onClick={() => handleSave(activeAngle)}
                  disabled={saved[activeAngle]}
                  className={saved[activeAngle] ? '' : 'btn-gold'}
                  style={{
                    flex: 1, padding: '13px', borderRadius: '12px',
                    border: 'none', fontSize: '11px', letterSpacing: '2px',
                    fontFamily: "'Syne', sans-serif", fontWeight: 700,
                    color: saved[activeAngle] ? '#9E9E9E' : '#1A0F00',
                    background: saved[activeAngle] ? '#F5F5F5' : undefined,
                    cursor: saved[activeAngle] ? 'default' : 'pointer',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '18px', fontWeight: 700, color: '#0A0A0A' }}>
              The Vault
            </span>
            <div className="gold-line" style={{ flex: 1 }} />
            <span className="badge-gold">{history.length} pieces</span>
          </div>

          {history.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '72px 32px',
              background: '#FFFFFF', border: '2px dashed #F0F0F0',
              borderRadius: '20px',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.2 }}>◈</div>
              <div style={{ fontSize: '16px', fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#0A0A0A', marginBottom: '8px' }}>
                Your vault awaits
              </div>
              <div style={{ fontSize: '13px', color: '#BDBDBD', fontFamily: 'Inter' }}>
                Upload your first call to begin building your authority archive
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {history.map((post) => (
                <div key={post.id} className="vault-card" style={{ padding: '22px 26px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span className="badge-gold" style={{ color: ANGLE_CONFIG[post.narrative_type]?.color || '#D4AF37' }}>
                      {ANGLE_CONFIG[post.narrative_type]?.icon} {ANGLE_CONFIG[post.narrative_type]?.label || post.narrative_type?.toUpperCase()}
                    </span>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: '11px', color: '#BDBDBD', fontFamily: 'Inter' }}>
                      {new Date(post.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.7, fontFamily: 'Inter', fontWeight: 400 }}>
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
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(16px)',
        }}>
          <div className="glass-card fade-up" style={{
            padding: '52px 44px', maxWidth: '440px', width: '90%', textAlign: 'center',
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '20px',
              background: 'linear-gradient(135deg, #F5D060, #A07820)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px', fontSize: '28px',
              boxShadow: '0 8px 32px rgba(212,175,55,0.4)',
              animation: 'glow 3s ease-in-out infinite',
            }}>✦</div>
            <h2 style={{
              fontFamily: "'Syne', sans-serif", fontSize: '28px',
              fontWeight: 800, color: '#0A0A0A', marginBottom: '10px', letterSpacing: '-0.5px',
            }}>
              Your free credits<br />
              <span style={{
                background: 'linear-gradient(135deg, #F5D060, #D4AF37)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>are exhausted.</span>
            </h2>
            <p style={{ fontSize: '14px', color: '#9E9E9E', fontFamily: 'Inter', marginBottom: '28px', lineHeight: 1.6 }}>
              Join the founders building their authority on LinkedIn every day.
            </p>
            <div style={{
              padding: '20px', background: 'linear-gradient(135deg, #FFFDF5, #FFF8DC)',
              borderRadius: '14px', marginBottom: '24px',
              border: '1px solid rgba(212,175,55,0.2)',
            }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '42px', fontWeight: 800, color: '#D4AF37' }}>
                $49<span style={{ fontSize: '16px', color: '#9E9E9E', fontFamily: 'Inter', fontWeight: 400 }}>/mo</span>
              </div>
              <div style={{ fontSize: '11px', color: '#8C6A1A', fontFamily: 'Inter', letterSpacing: '1px', marginTop: '4px' }}>
                UNLIMITED · FULL VAULT · PRIORITY ACCESS
              </div>
            </div>
            <button onClick={handleUpgrade} disabled={upgradeLoading} className="btn-gold" style={{
              width: '100%', padding: '16px', border: 'none', borderRadius: '14px',
              color: '#1A0F00', fontSize: '12px', letterSpacing: '2px',
              fontFamily: "'Syne', sans-serif", fontWeight: 700,
              cursor: 'pointer', marginBottom: '12px',
            }}>
              {upgradeLoading ? 'REDIRECTING...' : 'UPGRADE TO PRO →'}
            </button>
            <button onClick={() => setShowUpgradeModal(false)} style={{
              background: 'none', border: 'none', color: '#BDBDBD',
              fontSize: '12px', fontFamily: 'Inter', cursor: 'pointer',
            }}>
              maybe later
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid #F0F0F0', padding: '24px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(250,250,250,0.8)', position: 'relative', zIndex: 1,
      }}>
        <span style={{ fontSize: '11px', color: '#BDBDBD', fontFamily: 'Inter', letterSpacing: '1px' }}>
          GHOSTSAAS © 2026
        </span>
        <div className="gold-line" style={{ flex: 1, margin: '0 24px' }} />
        <span style={{ fontSize: '11px', color: '#BDBDBD', fontFamily: 'Inter', letterSpacing: '1px' }}>
          AUTHORITY INTELLIGENCE
        </span>
      </footer>
    </div>
  );
}