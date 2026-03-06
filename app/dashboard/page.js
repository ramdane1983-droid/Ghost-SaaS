"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://zynnnyxmwbgzbatphpjh.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5bm5ueXhtd2JnemJhdHBocGpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDk1MzYsImV4cCI6MjA4NzY4NTUzNn0.qCycJ1lej56BMO1Akti2qbPuVi1D1bGYptpskju8vPM"
);

const ANGLE_CONFIG = {
  rant: { label: 'THE RANT', icon: '⚡', color: '#C9A84C', description: 'Provocateur · Contrarian' },
  lesson: { label: 'THE LESSON', icon: '📖', color: '#A8C5DA', description: 'Éducatif · Actionnable' },
  vision: { label: 'THE VISION', icon: '🔭', color: '#B8A9D9', description: 'Visionnaire · Inspirant' },
};

export default function Dashboard() {
  const [email, setEmail] = useState('');
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

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    setHistory(data || []);
  };

  const handleUpload = async () => {
    if (!file) return alert("Sélectionne un fichier audio ou vidéo");
    if (!email) return alert("Entre ton email");
    setLoading(true);
    setAngles(null);
    setTranscript('');
    setSaved({});

    try {
      // 1. Upload fichier vers Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('videos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw new Error('Upload failed: ' + uploadError.message);

      // 2. Récupérer l'URL publique
      const { data: urlData } = supabase
        .storage
        .from('videos')
        .getPublicUrl(fileName);

      const fileUrl = urlData.publicUrl;

      // 3. Envoyer l'URL à l'API
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

  const handleUpgrade = async () => {
    if (!email) return alert("Entre ton email");
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
    }]);
    if (!error) {
      setSaved(p => ({ ...p, [angleKey]: true }));
      await fetchHistory();
    }
  };

  const handleCopy = (angleKey) => {
    navigator.clipboard.writeText(angles[angleKey]);
    setCopied(angleKey);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080808',
      color: '#E8E0D0',
      fontFamily: "'Georgia', serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080808; }
        input, textarea { background: transparent; color: #E8E0D0; outline: none; font-family: 'Montserrat', sans-serif; }
        input::placeholder { color: #444; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #C9A84C44; border-radius: 2px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-in { animation: fadeIn 0.6s ease forwards; }
        .angle-tab:hover { background: #C9A84C11 !important; }
        .btn-gold:hover { background: #B8933B !important; transform: translateY(-1px); }
        .btn-ghost:hover { background: #C9A84C11 !important; color: #C9A84C !important; }
        .vault-item:hover { border-color: #C9A84C44 !important; background: #111 !important; }
        .upload-zone:hover { border-color: #C9A84C88 !important; background: #C9A84C05 !important; }
      `}</style>

      {/* HEADER */}
      <div style={{
        borderBottom: '1px solid #1A1A1A',
        padding: '24px 48px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 100,
        background: '#08080899', backdropFilter: 'blur(10px)',
      }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 300, letterSpacing: '4px', color: '#C9A84C' }}>
            GHOST<span style={{ color: '#E8E0D0' }}>SAAS</span>
          </div>
          <div style={{ fontSize: '9px', letterSpacing: '3px', color: '#444', fontFamily: 'Montserrat', marginTop: '2px' }}>
            AUTHORITY INTELLIGENCE
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {creditsRemaining !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C9A84C', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: '11px', letterSpacing: '2px', color: '#888', fontFamily: 'Montserrat' }}>
                {creditsRemaining} CREDITS
              </span>
            </div>
          )}
          <a href="/" style={{
            fontSize: '9px', letterSpacing: '2px', color: '#333',
            fontFamily: 'Montserrat', textDecoration: 'none',
          }}>← HOME</a>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '60px 48px' }}>

        {/* HERO */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }} className="animate-in">
          <div style={{ fontSize: '11px', letterSpacing: '4px', color: '#C9A84C', fontFamily: 'Montserrat', fontWeight: 500, marginBottom: '20px' }}>
            ✦ YOUR WORDS. AMPLIFIED. ✦
          </div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '56px', fontWeight: 300, lineHeight: 1.1,
            color: '#E8E0D0', marginBottom: '16px',
          }}>
            Transform Your Voice<br /><em style={{ color: '#C9A84C' }}>Into Authority</em>
          </h1>
          <p style={{ fontSize: '14px', color: '#555', letterSpacing: '1px', fontFamily: 'Montserrat', fontWeight: 300 }}>
            Upload a call. Receive three strategic angles. Dominate LinkedIn.
          </p>
        </div>

        {/* EMAIL */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '9px', letterSpacing: '3px', color: '#C9A84C', fontFamily: 'Montserrat', marginBottom: '10px' }}>
            YOUR EMAIL
          </div>
          <input
            type="email"
            placeholder="founder@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              width: '100%', padding: '16px 24px',
              border: '1px solid #1E1E1E', borderRadius: '4px',
              fontSize: '14px', letterSpacing: '1px',
              background: '#0D0D0D', transition: 'border-color 0.3s',
            }}
            onFocus={e => e.target.style.borderColor = '#C9A84C44'}
            onBlur={e => e.target.style.borderColor = '#1E1E1E'}
          />
        </div>

        {/* UPLOAD */}
        <div
          className="upload-zone"
          style={{
            border: '1px solid #1E1E1E', borderRadius: '8px',
            padding: '48px', textAlign: 'center',
            marginBottom: '32px', background: '#0A0A0A',
            cursor: 'pointer', transition: 'all 0.3s',
          }}
          onClick={() => document.getElementById('file-upload').click()}
        >
          <input
            type="file"
            id="file-upload"
            accept="video/*,audio/*,.mp4,.mov,.mp3,.wav,.m4a,.webm"
            onChange={e => setFile(e.target.files[0])}
            style={{ display: 'none' }}
          />
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>{file ? '✓' : '◎'}</div>
          <div style={{
            fontSize: '11px', letterSpacing: '3px',
            color: file ? '#C9A84C' : '#333',
            fontFamily: 'Montserrat', marginBottom: '8px',
          }}>
            {file ? file.name.toUpperCase() : 'DROP YOUR ZOOM CALL OR VOICE MEMO'}
          </div>
          {!file && (
            <div style={{ fontSize: '11px', color: '#2A2A2A', fontFamily: 'Montserrat', letterSpacing: '1px' }}>
              MP4 · MOV · MP3 · WAV · M4A · WEBM
            </div>
          )}
        </div>

        {/* CTA BUTTON */}
        <button
          onClick={handleUpload}
          disabled={loading}
          className="btn-gold"
          style={{
            width: '100%', padding: '20px',
            background: loading ? '#1A1A1A' : '#C9A84C',
            color: loading ? '#444' : '#080808',
            border: 'none', borderRadius: '4px',
            fontSize: '11px', letterSpacing: '4px',
            fontFamily: 'Montserrat', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '64px', transition: 'all 0.3s',
          }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <span style={{
                display: 'inline-block', width: '14px', height: '14px',
                border: '2px solid #C9A84C44', borderTop: '2px solid #C9A84C',
                borderRadius: '50%', animation: 'spin 1s linear infinite',
              }} />
              ANALYZING YOUR GENIUS...
            </span>
          ) : 'EXTRACT 3 STRATEGIC ANGLES →'}
        </button>

        {/* TRANSCRIPT */}
        {transcript && (
          <div style={{
            padding: '24px 32px', background: '#0A0A0A',
            border: '1px solid #1A1A1A', borderLeft: '2px solid #C9A84C44',
            borderRadius: '4px', marginBottom: '48px',
          }} className="animate-in">
            <div style={{ fontSize: '9px', letterSpacing: '3px', color: '#C9A84C', fontFamily: 'Montserrat', marginBottom: '12px' }}>
              TRANSCRIPT
            </div>
            <p style={{ fontSize: '13px', color: '#555', lineHeight: 1.7, fontFamily: 'Montserrat', fontWeight: 300 }}>
              {transcript}
            </p>
          </div>
        )}

        {/* 3 ANGLES */}
        {angles && (
          <div style={{ marginBottom: '80px' }} className="animate-in">
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div style={{ fontSize: '9px', letterSpacing: '4px', color: '#C9A84C', fontFamily: 'Montserrat', marginBottom: '8px' }}>
                ✦ YOUR THREE ANGLES ✦
              </div>
              <div style={{ width: '40px', height: '1px', background: '#C9A84C44', margin: '0 auto' }} />
            </div>

            {/* TABS */}
            <div style={{
              display: 'flex', gap: '2px', background: '#0D0D0D',
              padding: '4px', borderRadius: '6px 6px 0 0',
              border: '1px solid #1A1A1A', borderBottom: 'none',
            }}>
              {Object.entries(ANGLE_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setActiveAngle(key)}
                  className="angle-tab"
                  style={{
                    flex: 1, padding: '14px',
                    background: activeAngle === key ? '#141414' : 'transparent',
                    border: 'none',
                    borderBottom: activeAngle === key ? `2px solid ${config.color}` : '2px solid transparent',
                    color: activeAngle === key ? config.color : '#333',
                    fontSize: '9px', letterSpacing: '2px',
                    fontFamily: 'Montserrat', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  {config.icon} {config.label}
                </button>
              ))}
            </div>

            {/* ANGLE CONTENT */}
            <div style={{
              background: '#0D0D0D', border: '1px solid #1A1A1A',
              borderTop: 'none', borderRadius: '0 0 6px 6px', padding: '40px',
            }}>
              <div style={{ fontSize: '10px', color: '#333', letterSpacing: '2px', fontFamily: 'Montserrat', marginBottom: '24px' }}>
                {ANGLE_CONFIG[activeAngle].description}
              </div>
              <p style={{
                fontSize: '15px', lineHeight: 1.8, color: '#C8BFA8',
                fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
                whiteSpace: 'pre-wrap', marginBottom: '32px',
              }}>
                {angles[activeAngle]}
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => handleCopy(activeAngle)}
                  className="btn-ghost"
                  style={{
                    flex: 1, padding: '14px', background: 'transparent',
                    border: '1px solid #222', borderRadius: '4px', color: '#555',
                    fontSize: '9px', letterSpacing: '2px', fontFamily: 'Montserrat',
                    fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  {copied === activeAngle ? '✓ COPIED' : '◻ COPY'}
                </button>
                <button
                  onClick={() => handleSave(activeAngle)}
                  disabled={saved[activeAngle]}
                  className="btn-gold"
                  style={{
                    flex: 1, padding: '14px',
                    background: saved[activeAngle] ? '#1A1A1A' : '#C9A84C',
                    border: 'none', borderRadius: '4px',
                    color: saved[activeAngle] ? '#C9A84C' : '#080808',
                    fontSize: '9px', letterSpacing: '2px', fontFamily: 'Montserrat',
                    fontWeight: 700,
                    cursor: saved[activeAngle] ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {saved[activeAngle] ? '✓ ARCHIVED' : '◈ ARCHIVE'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VAULT */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <div style={{ fontSize: '9px', letterSpacing: '4px', color: '#C9A84C', fontFamily: 'Montserrat' }}>
              THE VAULT
            </div>
            <div style={{ flex: 1, height: '1px', background: '#1A1A1A' }} />
            <div style={{ fontSize: '9px', letterSpacing: '2px', color: '#333', fontFamily: 'Montserrat' }}>
              {history.length} PIECES
            </div>
          </div>

          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 40px', border: '1px solid #111', borderRadius: '8px' }}>
              <div style={{ fontSize: '32px', marginBottom: '16px', opacity: 0.3 }}>◎</div>
              <div style={{ fontSize: '11px', letterSpacing: '3px', color: '#222', fontFamily: 'Montserrat', marginBottom: '8px' }}>
                YOUR VAULT AWAITS
              </div>
              <div style={{ fontSize: '12px', color: '#1E1E1E', fontFamily: 'Montserrat', fontWeight: 300 }}>
                Upload your first call to begin building your authority archive
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {history.map((post) => (
                <div key={post.id} className="vault-item" style={{
                  padding: '28px 32px', border: '1px solid #111',
                  borderRadius: '6px', background: '#0A0A0A', transition: 'all 0.3s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <span style={{
                      fontSize: '9px', letterSpacing: '2px',
                      color: ANGLE_CONFIG[post.narrative_type]?.color || '#C9A84C',
                      fontFamily: 'Montserrat', fontWeight: 600,
                    }}>
                      {ANGLE_CONFIG[post.narrative_type]?.icon} {ANGLE_CONFIG[post.narrative_type]?.label || post.narrative_type?.toUpperCase()}
                    </span>
                    <div style={{ flex: 1, height: '1px', background: '#111' }} />
                    <span style={{ fontSize: '9px', color: '#222', fontFamily: 'Montserrat', letterSpacing: '1px' }}>
                      {new Date(post.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <p style={{
                    fontSize: '14px', color: '#444', lineHeight: 1.7,
                    fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
                  }}>
                    {post.content_ai?.substring(0, 200)}...
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* UPGRADE MODAL */}
      {showUpgradeModal && (
        <div style={{
          position: 'fixed', inset: 0, background: '#000000CC',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            background: '#0D0D0D', border: '1px solid #C9A84C33',
            borderRadius: '8px', padding: '60px',
            maxWidth: '480px', width: '90%', textAlign: 'center',
          }} className="animate-in">
            <div style={{ fontSize: '32px', marginBottom: '24px' }}>✦</div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: '32px',
              fontWeight: 300, color: '#E8E0D0', marginBottom: '12px',
            }}>
              Your free genius<br /><em style={{ color: '#C9A84C' }}>is exhausted.</em>
            </div>
            <p style={{
              fontSize: '12px', color: '#444', fontFamily: 'Montserrat',
              fontWeight: 300, letterSpacing: '1px', marginBottom: '40px', lineHeight: 1.7,
            }}>
              Unlock unlimited authority content.<br />
              Join the founders building their empire on LinkedIn.
            </p>
            <div style={{
              fontSize: '28px', color: '#C9A84C',
              fontFamily: "'Cormorant Garamond', serif", marginBottom: '32px',
            }}>
              $49<span style={{ fontSize: '14px', color: '#444', fontFamily: 'Montserrat' }}> / month</span>
            </div>
            <button
              onClick={handleUpgrade}
              disabled={upgradeLoading}
              className="btn-gold"
              style={{
                width: '100%', padding: '18px', background: '#C9A84C',
                border: 'none', borderRadius: '4px', color: '#080808',
                fontSize: '10px', letterSpacing: '3px', fontFamily: 'Montserrat',
                fontWeight: 700, cursor: 'pointer', marginBottom: '16px', transition: 'all 0.2s',
              }}
            >
              {upgradeLoading ? 'REDIRECTING...' : 'UPGRADE TO PRO →'}
            </button>
            <button
              onClick={() => setShowUpgradeModal(false)}
              style={{
                background: 'none', border: 'none', color: '#222',
                fontSize: '11px', fontFamily: 'Montserrat',
                cursor: 'pointer', letterSpacing: '1px',
              }}
            >
              maybe later
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div style={{ textAlign: 'center', padding: '40px', borderTop: '1px solid #111' }}>
        <div style={{ fontSize: '9px', letterSpacing: '3px', color: '#1E1E1E', fontFamily: 'Montserrat' }}>
          GHOSTSAAS © 2026 — AUTHORITY INTELLIGENCE
        </div>
      </div>
    </div>
  );
}