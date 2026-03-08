"use client";
import { useState, useEffect } from 'react';


import { supabase } from '../lib/supabase';

const ANGLE_CONFIG = {
  rant: { label: 'THE RANT', icon: '⚡', color: '#E8472A', description: 'Provocateur · Contrarian' },
  lesson: { label: 'THE LESSON', icon: '📖', color: '#4A90D9', description: 'Éducatif · Actionnable' },
  vision: { label: 'THE VISION', icon: '🔭', color: '#9B6ED4', description: 'Visionnaire · Inspirant' },
};

export default function Dashboard() {
  const [email, setEmail] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [angles, setAngles] = useState<any>(null);
  const [saved, setSaved] = useState<any>({});
  const [copied, setCopied] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [plan, setPlan] = useState('free');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [activeAngle, setActiveAngle] = useState('rant');
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<'generate' | 'vault'>('generate');

  async function fetchHistory(userEmail: string) {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_email', userEmail)  // ✅ FIX: was 'email'
      .order('created_at', { ascending: false });
    if (!error) setHistory(data || []);
  }

  async function fetchCredits(userEmail: string) {
    const { data } = await supabase
      .from('credits')
      .select('credits_remaining, plan')
      .eq('user_email', userEmail)
      .single();
    if (data) {
      setCreditsRemaining(data.credits_remaining);
      setPlan(data.plan);
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedEmail = localStorage.getItem('ghostsaas_email');
    if (!savedEmail) { window.location.href = '/login'; return; }
    setEmail(savedEmail);
    setAuthLoading(false);
    fetchHistory(savedEmail);
    fetchCredits(savedEmail);
  }, []);

  function handleLogout() {
    localStorage.removeItem('ghostsaas_email');
    window.location.href = '/login';
  }

  async function handleUpload() {
    if (!file) return alert("Sélectionne un fichier audio ou vidéo");
    setLoading(true); setAngles(null); setTranscript(''); setSaved({});
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('videos')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw new Error('Upload failed: ' + uploadError.message);
      const { data: urlData } = supabase.storage.from('videos').getPublicUrl(fileName);
      const res = await fetch('/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
    } catch (err: any) { alert("Erreur : " + err.message); }
    finally { setLoading(false); }
  }

  async function handleUpgrade() {
    setUpgradeLoading(true);
    try {
      const res = await fetch('/api/stripe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err: any) { alert("Erreur : " + err.message); }
    finally { setUpgradeLoading(false); }
  }

  async function handleSave(angleKey: string) {
    const { error } = await supabase.from('posts').insert([{
      content_raw: transcript,
      content_ai: angles[angleKey],
      status: 'draft',
      narrative_type: angleKey,
      user_email: email,  // ✅ FIX: was 'email'
    }]);
    if (!error) {
      setSaved((p: any) => ({ ...p, [angleKey]: true }));
      await fetchHistory(email);
    }
  }

  function handleCopy(angleKey: string) {
    navigator.clipboard.writeText(angles[angleKey]);
    setCopied(angleKey);
    setTimeout(() => setCopied(''), 2000);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  if (authLoading) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #1A1A1A', borderTop: '2px solid #C9A84C', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ fontSize: '10px', letterSpacing: '4px', color: '#C9A84C', fontFamily: 'Montserrat' }}>LOADING</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#F0EDE6' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Montserrat:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 20px rgba(201,168,76,0.3); } 50% { box-shadow: 0 0 40px rgba(201,168,76,0.6); } }

        .fade-up { animation: fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .fade-up-2 { animation: fadeUp 0.6s 0.1s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .fade-up-3 { animation: fadeUp 0.6s 0.2s cubic-bezier(0.22, 1, 0.36, 1) both; }

        .btn-gold {
          background: linear-gradient(135deg, #D4AF37 0%, #C9A84C 40%, #A07820 100%);
          background-size: 200% auto;
          border: none;
          position: relative; overflow: hidden;
          transition: all 0.3s ease;
        }
        .btn-gold::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          background-size: 200% auto;
          animation: shimmer 2.5s linear infinite;
        }
        .btn-gold:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(201,168,76,0.4); }
        .btn-gold:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

        .glass-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(20px);
          border-radius: 20px;
        }
        .glass-card-hover {
          transition: all 0.3s ease;
        }
        .glass-card-hover:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(201,168,76,0.3);
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.4);
        }

        .upload-zone {
          border: 1px dashed rgba(201,168,76,0.3);
          border-radius: 16px;
          background: rgba(201,168,76,0.02);
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .upload-zone:hover, .upload-zone.drag-over {
          border-color: #C9A84C;
          background: rgba(201,168,76,0.06);
          box-shadow: 0 0 0 4px rgba(201,168,76,0.08), inset 0 0 40px rgba(201,168,76,0.04);
        }

        .nav-tab {
          transition: all 0.25s ease;
          cursor: pointer;
          position: relative;
        }
        .nav-tab::after {
          content: '';
          position: absolute;
          bottom: -1px; left: 50%; right: 50%;
          height: 2px;
          background: #C9A84C;
          transition: all 0.25s ease;
          border-radius: 2px;
        }
        .nav-tab.active::after { left: 0; right: 0; }

        .angle-tab {
          transition: all 0.2s ease;
          cursor: pointer;
          border-radius: 10px;
        }
        .angle-tab:hover { background: rgba(255,255,255,0.05) !important; }

        .vault-item {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          transition: all 0.3s ease;
        }
        .vault-item:hover {
          background: rgba(255,255,255,0.04);
          border-color: rgba(201,168,76,0.25);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }

        .gold-text { color: #C9A84C; }
        .gold-border { border-color: rgba(201,168,76,0.3) !important; }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0A0A0A; }
        ::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: #C9A84C; }

        input, textarea { background: transparent; color: #F0EDE6; outline: none; font-family: 'Montserrat', sans-serif; width: 100%; }
        input::placeholder { color: #444; }
      `}</style>

      {/* NOISE TEXTURE OVERLAY */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
        opacity: 0.4,
      }} />

      {/* GLOW EFFECTS */}
      <div style={{ position: 'fixed', top: '-200px', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse, rgba(201,168,76,0.06) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* HEADER */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(8,8,8,0.85)', backdropFilter: 'blur(32px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 32px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* LOGO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #D4AF37, #7A5A10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', animation: 'glow 3s ease-in-out infinite' }}>◈</div>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, letterSpacing: '3px', color: '#F0EDE6' }}>GHOST<span className="gold-text">SAAS</span></div>
              <div style={{ fontSize: '7px', letterSpacing: '4px', color: '#444', fontFamily: 'Montserrat' }}>AUTHORITY ENGINE</div>
            </div>
          </div>

          {/* NAV TABS */}
          <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {(['generate', 'vault'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`nav-tab ${activeTab === tab ? 'active' : ''}`}
                style={{ padding: '20px 24px', background: 'none', border: 'none', fontSize: '10px', letterSpacing: '2.5px', fontFamily: 'Montserrat', fontWeight: 600, color: activeTab === tab ? '#C9A84C' : '#555', cursor: 'pointer' }}>
                {tab === 'generate' ? '⚡ GENERATE' : `◈ VAULT (${history.length})`}
              </button>
            ))}
          </div>

          {/* USER INFO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {creditsRemaining !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: 'rgba(201,168,76,0.08)', borderRadius: '100px', border: '1px solid rgba(201,168,76,0.2)' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: plan === 'pro' ? '#4ADE80' : '#C9A84C', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: '10px', letterSpacing: '1px', color: '#C9A84C', fontFamily: 'Montserrat', fontWeight: 600 }}>
                  {plan === 'pro' ? '∞ PRO' : `${creditsRemaining} credits`}
                </span>
              </div>
            )}
            <span style={{ fontSize: '11px', color: '#444', fontFamily: 'Montserrat', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
            <button onClick={handleLogout} style={{ padding: '7px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '10px', fontFamily: 'Montserrat', fontWeight: 500, color: '#666', cursor: 'pointer', letterSpacing: '1.5px', transition: 'all 0.2s ease' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'rgba(201,168,76,0.4)'; (e.target as HTMLElement).style.color = '#C9A84C'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.target as HTMLElement).style.color = '#666'; }}>
              LOGOUT
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '48px 32px 100px', position: 'relative', zIndex: 1 }}>

        {/* ===== GENERATE TAB ===== */}
        {activeTab === 'generate' && (
          <>
            {/* HERO */}
            <div style={{ marginBottom: '48px' }} className="fade-up">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 14px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '100px', marginBottom: '20px' }}>
                <span style={{ fontSize: '9px', letterSpacing: '3px', color: '#C9A84C', fontFamily: 'Montserrat', fontWeight: 600 }}>✦ YOUR WORDS. AMPLIFIED.</span>
              </div>
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '52px', fontWeight: 300, lineHeight: 1.1, color: '#F0EDE6', letterSpacing: '-0.5px' }}>
                Transform Your Voice<br />
                <em style={{ color: '#C9A84C', fontWeight: 400 }}>Into Authority.</em>
              </h1>
              <p style={{ fontSize: '13px', color: '#555', fontFamily: 'Montserrat', fontWeight: 300, marginTop: '16px', letterSpacing: '0.5px', lineHeight: 1.7 }}>
                Upload a call · Receive three strategic angles · Dominate LinkedIn.
              </p>
            </div>

            {/* UPLOAD CARD */}
            <div className="glass-card fade-up-2" style={{ padding: '32px', marginBottom: '16px' }}>
              <div
                className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                style={{ padding: '48px 32px', textAlign: 'center', marginBottom: '20px' }}
                onClick={() => document.getElementById('file-upload')?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}>
                <input type="file" id="file-upload" accept="video/*,audio/*,.mp4,.mov,.mp3,.wav,.m4a,.webm" onChange={e => setFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: file ? 'linear-gradient(135deg, #D4AF37, #7A5A10)' : 'rgba(255,255,255,0.04)', border: file ? 'none' : '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px', transition: 'all 0.4s ease', boxShadow: file ? '0 8px 32px rgba(201,168,76,0.3)' : 'none' }}>
                  {file ? '✓' : '🎙'}
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 400, color: file ? '#C9A84C' : '#888', marginBottom: '8px' }}>
                  {file ? file.name : 'Drop your Zoom call or voice memo'}
                </div>
                <div style={{ fontSize: '10px', color: '#333', fontFamily: 'Montserrat', letterSpacing: '2px' }}>
                  {file ? (
                    <span style={{ color: '#C9A84C', cursor: 'pointer', textDecoration: 'underline' }} onClick={(e) => { e.stopPropagation(); setFile(null); }}>Remove file</span>
                  ) : 'MP4 · MOV · MP3 · WAV · M4A · WEBM'}
                </div>
              </div>

              <button onClick={handleUpload} disabled={loading || !file} className="btn-gold"
                style={{ width: '100%', padding: '17px', borderRadius: '12px', color: '#1A0A00', fontSize: '11px', letterSpacing: '3px', fontFamily: 'Montserrat', fontWeight: 700, cursor: loading || !file ? 'not-allowed' : 'pointer' }}>
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(26,10,0,0.2)', borderTop: '2px solid #1A0A00', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    ANALYZING YOUR GENIUS...
                  </span>
                ) : 'EXTRACT 3 STRATEGIC ANGLES →'}
              </button>
            </div>

            {/* TRANSCRIPT */}
            {transcript && (
              <div className="glass-card fade-up" style={{ padding: '24px 28px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ width: '2px', height: '16px', background: 'linear-gradient(180deg, #D4AF37, #7A5A10)', borderRadius: '2px' }} />
                  <span style={{ fontSize: '9px', letterSpacing: '3px', color: '#C9A84C', fontFamily: 'Montserrat', fontWeight: 600 }}>TRANSCRIPT</span>
                </div>
                <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.8, fontFamily: 'Montserrat', fontWeight: 300 }}>{transcript}</p>
              </div>
            )}

            {/* 3 ANGLES */}
            {angles && (
              <div style={{ marginBottom: '48px' }} className="fade-up">
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <span style={{ fontSize: '9px', letterSpacing: '3px', color: '#555', fontFamily: 'Montserrat' }}>✦ YOUR THREE ANGLES ✦</span>
                </div>

                {/* TABS */}
                <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '14px 14px 0 0', border: '1px solid rgba(255,255,255,0.06)', borderBottom: 'none' }}>
                  {Object.entries(ANGLE_CONFIG).map(([key, config]) => (
                    <button key={key} onClick={() => setActiveAngle(key)} className="angle-tab"
                      style={{ flex: 1, padding: '12px 8px', background: activeAngle === key ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none', color: activeAngle === key ? config.color : '#444', fontSize: '9px', letterSpacing: '2px', fontFamily: 'Montserrat', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                      {config.icon} {config.label}
                    </button>
                  ))}
                </div>

                <div className="glass-card" style={{ borderRadius: '0 0 20px 20px', padding: '28px 32px' }}>
                  <span style={{ display: 'inline-block', padding: '4px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '100px', fontSize: '9px', color: '#555', letterSpacing: '2px', fontFamily: 'Montserrat', fontWeight: 500, marginBottom: '20px' }}>
                    {ANGLE_CONFIG[activeAngle as keyof typeof ANGLE_CONFIG].description}
                  </span>
                  <p style={{ fontSize: '16px', lineHeight: 1.9, color: '#D4CFC6', fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, whiteSpace: 'pre-wrap', marginBottom: '24px' }}>
                    {angles[activeAngle]}
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleCopy(activeAngle)}
                      style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '10px', letterSpacing: '2px', fontFamily: 'Montserrat', fontWeight: 600, color: '#666', cursor: 'pointer', transition: 'all 0.2s ease' }}
                      onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)'; (e.target as HTMLElement).style.color = '#F0EDE6'; }}
                      onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.target as HTMLElement).style.color = '#666'; }}>
                      {copied === activeAngle ? '✓ COPIED' : '⎘ COPY'}
                    </button>
                    <button onClick={() => handleSave(activeAngle)} disabled={saved[activeAngle]} className={saved[activeAngle] ? '' : 'btn-gold'}
                      style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', fontSize: '10px', letterSpacing: '2px', fontFamily: 'Montserrat', fontWeight: 600, color: saved[activeAngle] ? '#444' : '#1A0A00', background: saved[activeAngle] ? 'rgba(255,255,255,0.02)' : undefined, cursor: saved[activeAngle] ? 'default' : 'pointer' }}>
                      {saved[activeAngle] ? '✓ ARCHIVED' : '◈ ARCHIVE'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== VAULT TAB ===== */}
        {activeTab === 'vault' && (
          <div className="fade-up">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
              <div>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '36px', fontWeight: 400, color: '#F0EDE6', letterSpacing: '1px' }}>The Vault</h2>
                <p style={{ fontSize: '11px', color: '#444', fontFamily: 'Montserrat', fontWeight: 300, letterSpacing: '1px', marginTop: '4px' }}>Your authority archive</p>
              </div>
              <div style={{ padding: '8px 18px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '100px', fontSize: '10px', letterSpacing: '2px', color: '#C9A84C', fontFamily: 'Montserrat', fontWeight: 600 }}>
                {history.length} PIECES
              </div>
            </div>

            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 32px', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.1 }}>◈</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 400, color: '#F0EDE6', marginBottom: '8px' }}>Your vault awaits</div>
                <div style={{ fontSize: '12px', color: '#444', fontFamily: 'Montserrat', fontWeight: 300, marginBottom: '24px' }}>Generate your first post to begin building your authority archive</div>
                <button onClick={() => setActiveTab('generate')} className="btn-gold"
                  style={{ padding: '12px 28px', borderRadius: '10px', color: '#1A0A00', fontSize: '10px', letterSpacing: '3px', fontFamily: 'Montserrat', fontWeight: 700, cursor: 'pointer', border: 'none' }}>
                  START GENERATING →
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {history.map((post) => {
                  const config = ANGLE_CONFIG[post.narrative_type as keyof typeof ANGLE_CONFIG];
                  return (
                    <div key={post.id} className="vault-item" style={{ padding: '24px 28px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '100px', fontSize: '9px', letterSpacing: '1.5px', color: config?.color || '#C9A84C', fontFamily: 'Montserrat', fontWeight: 600, border: `1px solid ${config?.color || '#C9A84C'}22` }}>
                          {config?.icon} {config?.label || post.narrative_type?.toUpperCase()}
                        </span>
                        <div style={{ flex: 1 }} />
                        <span style={{ fontSize: '11px', color: '#333', fontFamily: 'Montserrat' }}>
                          {new Date(post.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <p style={{ fontSize: '15px', color: '#888', lineHeight: 1.7, fontFamily: "'Cormorant Garamond', serif", fontWeight: 400 }}>
                        {post.content_ai?.substring(0, 260)}...
                      </p>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                        <button
                          onClick={() => { navigator.clipboard.writeText(post.content_ai); }}
                          style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', fontSize: '9px', letterSpacing: '2px', fontFamily: 'Montserrat', fontWeight: 600, color: '#555', cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseEnter={e => { (e.target as HTMLElement).style.color = '#F0EDE6'; (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)'; }}
                          onMouseLeave={e => { (e.target as HTMLElement).style.color = '#555'; (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}>
                          ⎘ COPY
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* UPGRADE MODAL */}
      {showUpgradeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(24px)' }}>
          <div className="glass-card fade-up" style={{ padding: '48px 40px', maxWidth: '420px', width: '90%', textAlign: 'center', border: '1px solid rgba(201,168,76,0.2)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #D4AF37, #7A5A10)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '24px', animation: 'glow 2s ease-in-out infinite' }}>✦</div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '30px', fontWeight: 400, color: '#F0EDE6', marginBottom: '10px', lineHeight: 1.2 }}>
              Your free genius<br /><em className="gold-text">is exhausted.</em>
            </h2>
            <p style={{ fontSize: '12px', color: '#555', fontFamily: 'Montserrat', fontWeight: 300, marginBottom: '28px', lineHeight: 1.7 }}>
              Join the founders building their authority on LinkedIn every day.
            </p>
            <div style={{ padding: '20px', background: 'rgba(201,168,76,0.05)', borderRadius: '14px', marginBottom: '24px', border: '1px solid rgba(201,168,76,0.15)' }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '44px', fontWeight: 600, color: '#C9A84C' }}>
                $79<span style={{ fontSize: '16px', color: '#555', fontFamily: 'Montserrat', fontWeight: 300 }}>/month</span>
              </div>
              <div style={{ fontSize: '9px', color: '#7A5A10', fontFamily: 'Montserrat', letterSpacing: '2px', marginTop: '6px' }}>
                UNLIMITED · FULL VAULT · PRIORITY ACCESS
              </div>
            </div>
            <button onClick={handleUpgrade} disabled={upgradeLoading} className="btn-gold"
              style={{ width: '100%', padding: '15px', borderRadius: '12px', color: '#1A0A00', fontSize: '11px', letterSpacing: '3px', fontFamily: 'Montserrat', fontWeight: 700, cursor: 'pointer', marginBottom: '12px', border: 'none' }}>
              {upgradeLoading ? 'REDIRECTING...' : 'UPGRADE TO PRO →'}
            </button>
            <button onClick={() => setShowUpgradeModal(false)}
              style={{ background: 'none', border: 'none', color: '#333', fontSize: '11px', fontFamily: 'Montserrat', cursor: 'pointer', letterSpacing: '1px' }}>
              maybe later
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <span style={{ fontSize: '9px', color: '#2A2A2A', fontFamily: 'Montserrat', letterSpacing: '3px' }}>GHOSTSAAS © 2026</span>
        <span style={{ fontSize: '9px', color: '#2A2A2A', fontFamily: 'Montserrat', letterSpacing: '3px' }}>AUTHORITY INTELLIGENCE</span>
      </footer>
    </div>
  );
}