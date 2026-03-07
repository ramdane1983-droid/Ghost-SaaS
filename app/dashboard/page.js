"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://zynnnyxmwbgzbatphpjh.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5bm5ueXhtd2JnemJhdHBocGpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjEwOTUzNiwiZXhwIjoyMDg3Njg1NTM2fQ.Z2WF1be5gp00z1w5wtZppv4832m8RKws-87Ju4pw1rM"
);

const ANGLE_CONFIG = {
  rant: { label: 'THE RANT', icon: '⚡', color: '#C9A84C', description: 'Provocateur · Contrarian' },
  lesson: { label: 'THE LESSON', icon: '📖', color: '#7A9BB5', description: 'Éducatif · Actionnable' },
  vision: { label: 'THE VISION', icon: '🔭', color: '#9B8EC4', description: 'Visionnaire · Inspirant' },
};

export default function Dashboard() {
  const [email, setEmail] = useState('');
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
    const savedEmail = localStorage.getItem('ghostsaas_email');
    if (!savedEmail) {
      window.location.href = '/login';
      return;
    }
    setEmail(savedEmail);
    setAuthLoading(false);
    fetchHistory(savedEmail);
  }, []);

  if (authLoading) return (
    <div style={{
      minHeight: '100vh', background: '#FAFAF8',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          border: '2px solid #F0EDE6', borderTop: '2px solid #C9A84C',
          animation: 'spin 1s linear infinite', margin: '0 auto 16px',
        }} />
        <div style={{ fontSize: '10px', letterSpacing: '4px', color: '#C9A84C', fontFamily: 'Montserrat' }}>LOADING</div>
      </div>
    </div>
  );

  const fetchHistory = async (userEmail) => {
    const { data } = await supabase.from('posts').select('*')
      .eq('email', userEmail || email)
      .order('created_at', { ascending: false });
    setHistory(data || []);
  };

  const handleUpload = async () => {
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
      setAngles(data.angles); setTranscript(data.transcript);
      setCreditsRemaining(data.credits_remaining); setActiveAngle('rant');
    } catch (err) { alert("Erreur : " + err.message); }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('ghostsaas_email');
    window.location.href = '/login';
  };

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    try {
      const res = await fetch('/api/stripe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) { alert("Erreur : " + err.message); }
    finally { setUpgradeLoading(false); }
  };

  const handleSave = async (angleKey) => {
    const { error } = await supabase.from('posts').insert([{
      content_raw: transcript, content_ai: angles[angleKey],
      status: 'draft', narrative_type: angleKey, email,
    }]);
    if (!error) { setSaved(p => ({ ...p, [angleKey]: true })); await fetchHistory(email); }
  };

  const handleCopy = (angleKey) => {
    navigator.clipboard.writeText(angles[angleKey]);
    setCopied(angleKey); setTimeout(() => setCopied(''), 2000);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', color: '#1A1208' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Montserrat:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #FAFAF8; }
        input { background: transparent; color: #1A1208; outline: none; font-family: 'Montserrat', sans-serif; width: 100%; }
        input::placeholder { color: #C4B99A; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #E8D9A8; border-radius: 2px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .fade-up { animation: fadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .fade-up-2 { animation: fadeUp 0.7s 0.1s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .fade-up-3 { animation: fadeUp 0.7s 0.2s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .btn-gold {
          background: linear-gradient(135deg, #D4AF37 0%, #C9A84C 50%, #A07820 100%);
          background-size: 200% auto; border: none;
          box-shadow: 0 4px 20px rgba(201,168,76,0.3), inset 0 1px 0 rgba(255,255,255,0.2);
          transition: all 0.4s ease; position: relative; overflow: hidden;
        }
        .btn-gold::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          background-size: 200% auto; animation: shimmer 3s linear infinite;
        }
        .btn-gold:hover { box-shadow: 0 8px 36px rgba(201,168,76,0.45); transform: translateY(-2px); }
        .btn-gold:disabled { background: #E8E4DC; box-shadow: none; transform: none; color: #B0A898 !important; }
        .btn-outline {
          background: #FFFFFF; border: 1px solid #E8E4DC;
          transition: all 0.25s ease; box-shadow: 0 1px 4px rgba(26,18,8,0.04);
        }
        .btn-outline:hover { border-color: #C9A84C; color: #C9A84C !important; box-shadow: 0 4px 16px rgba(201,168,76,0.15); transform: translateY(-1px); }
        .card { background: #FFFFFF; border: 1px solid #EDE8DE; border-radius: 20px; box-shadow: 0 4px 24px rgba(26,18,8,0.05), 0 1px 4px rgba(26,18,8,0.03); }
        .upload-zone { border: 2px dashed #E8E4DC; border-radius: 16px; background: #FDFCF9; transition: all 0.3s ease; cursor: pointer; }
        .upload-zone:hover, .upload-zone.drag-over { border-color: #C9A84C; background: linear-gradient(135deg, #FFFEF9, #FFF8E6); box-shadow: 0 0 0 4px rgba(201,168,76,0.08); }
        .tab-btn { transition: all 0.2s ease; }
        .tab-btn:hover { background: #F5F2EC !important; }
        .vault-card { background: #FFFFFF; border: 1px solid #EDE8DE; border-radius: 16px; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(26,18,8,0.04); }
        .vault-card:hover { border-color: #C9A84C; box-shadow: 0 8px 32px rgba(201,168,76,0.12); transform: translateY(-2px); }
        .gold-line { height: 1px; background: linear-gradient(90deg, transparent, #C9A84C55, transparent); }
        .gold-badge { background: linear-gradient(135deg, #FFF8E6, #FFF0C0); border: 1px solid rgba(201,168,76,0.25); border-radius: 100px; padding: 4px 12px; font-size: 10px; letter-spacing: 1.5px; color: #8C6A1A; font-family: 'Montserrat'; font-weight: 600; }
      `}</style>

      {/* HEADER */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(250,250,248,0.88)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid #EDE8DE', boxShadow: '0 2px 16px rgba(26,18,8,0.04)',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 32px', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #D4AF37, #A07820)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#FFF', boxShadow: '0 4px 12px rgba(201,168,76,0.35)' }}>◈</div>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 600, letterSpacing: '2px', color: '#1A1208' }}>
                GHOST<span style={{ color: '#C9A84C' }}>SAAS</span>
              </div>
              <div style={{ fontSize: '8px', letterSpacing: '3px', color: '#C4B99A', fontFamily: 'Montserrat', fontWeight: 500 }}>AUTHORITY ENGINE</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {creditsRemaining !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#C9A84C', boxShadow: '0 0 8px rgba(201,168,76,0.6)', animation: 'pulse 2s infinite' }} />
                <span className="gold-badge">{creditsRemaining} credits</span>
              </div>
            )}
            <span style={{ fontSize: '12px', color: '#A09070', fontFamily: 'Montserrat', fontWeight: 300, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
            <button onClick={handleLogout} className="btn-outline" style={{ padding: '7px 16px', borderRadius: '8px', fontSize: '11px', fontFamily: 'Montserrat', fontWeight: 500, color: '#7A6840', cursor: 'pointer', letterSpacing: '1px' }}>LOGOUT</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '820px', margin: '0 auto', padding: '60px 24px 120px' }}>

        {/* HERO */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }} className="fade-up">
          <div className="gold-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>✦ YOUR WORDS. AMPLIFIED.</div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '58px', fontWeight: 400, lineHeight: 1.1, color: '#1A1208', marginBottom: '16px', letterSpacing: '-0.5px' }}>
            Transform Your Voice<br /><em style={{ color: '#C9A84C', fontWeight: 300 }}>Into Authority</em>
          </h1>
          <p style={{ fontSize: '14px', color: '#A09070', fontFamily: 'Montserrat', fontWeight: 300, lineHeight: 1.7, letterSpacing: '0.5px' }}>
            Upload a call. Receive three strategic angles. Dominate LinkedIn.
          </p>
        </div>

        {/* UPLOAD CARD */}
        <div className="card fade-up-2" style={{ padding: '36px', marginBottom: '20px' }}>
          <div className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
            style={{ padding: '52px 32px', textAlign: 'center', marginBottom: '24px' }}
            onClick={() => document.getElementById('file-upload').click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}>
            <input type="file" id="file-upload"
              accept="video/*,audio/*,.mp4,.mov,.mp3,.wav,.m4a,.webm"
              onChange={e => setFile(e.target.files[0])}
              style={{ display: 'none' }} />
            <div style={{ width: '68px', height: '68px', borderRadius: '18px', background: file ? 'linear-gradient(135deg, #D4AF37, #A07820)' : 'linear-gradient(135deg, #F5F2EC, #EDE8DE)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '30px', boxShadow: file ? '0 8px 28px rgba(201,168,76,0.35)' : '0 4px 12px rgba(26,18,8,0.06)', transition: 'all 0.4s ease' }}>
              {file ? '✓' : '🎙'}
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 500, color: file ? '#C9A84C' : '#1A1208', marginBottom: '8px' }}>
              {file ? file.name : 'Drop your Zoom call or voice memo'}
            </div>
            <div style={{ fontSize: '11px', color: '#C4B99A', fontFamily: 'Montserrat', letterSpacing: '1.5px' }}>
              {file ? (
                <span style={{ color: '#C9A84C', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}>Remove file</span>
              ) : 'MP4 · MOV · MP3 · WAV · M4A · WEBM'}
            </div>
          </div>
          <button onClick={handleUpload} disabled={loading || !file} className="btn-gold" style={{ width: '100%', padding: '18px', borderRadius: '14px', color: '#2A1800', fontSize: '11px', letterSpacing: '3px', fontFamily: 'Montserrat', fontWeight: 700, cursor: loading || !file ? 'not-allowed' : 'pointer' }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(42,24,0,0.2)', borderTop: '2px solid #2A1800', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                ANALYZING YOUR GENIUS...
              </span>
            ) : 'EXTRACT 3 STRATEGIC ANGLES →'}
          </button>
        </div>

        {/* TRANSCRIPT */}
        {transcript && (
          <div className="card fade-up" style={{ padding: '24px 28px', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '3px', height: '20px', background: 'linear-gradient(180deg, #D4AF37, #A07820)', borderRadius: '2px' }} />
              <span style={{ fontSize: '9px', letterSpacing: '3px', color: '#C9A84C', fontFamily: 'Montserrat', fontWeight: 600 }}>TRANSCRIPT</span>
            </div>
            <p style={{ fontSize: '13px', color: '#7A6840', lineHeight: 1.8, fontFamily: 'Montserrat', fontWeight: 300 }}>{transcript}</p>
          </div>
        )}

        {/* 3 ANGLES */}
        {angles && (
          <div style={{ marginBottom: '72px' }} className="fade-up">
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div className="gold-badge" style={{ display: 'inline-block', marginBottom: '12px' }}>✦ YOUR THREE ANGLES ✦</div>
              <div className="gold-line" />
            </div>
            <div style={{ display: 'flex', gap: '4px', background: '#F5F2EC', padding: '4px', borderRadius: '14px 14px 0 0', border: '1px solid #EDE8DE', borderBottom: 'none' }}>
              {Object.entries(ANGLE_CONFIG).map(([key, config]) => (
                <button key={key} onClick={() => setActiveAngle(key)} className="tab-btn" style={{ flex: 1, padding: '13px 8px', background: activeAngle === key ? '#FFFFFF' : 'transparent', border: 'none', borderRadius: '10px', color: activeAngle === key ? config.color : '#A09070', fontSize: '9px', letterSpacing: '2px', fontFamily: 'Montserrat', fontWeight: 600, cursor: 'pointer', boxShadow: activeAngle === key ? '0 2px 8px rgba(26,18,8,0.08)' : 'none' }}>
                  {config.icon} {config.label}
                </button>
              ))}
            </div>
            <div className="card" style={{ borderRadius: '0 0 20px 20px', padding: '32px' }}>
              <span style={{ display: 'inline-block', padding: '4px 12px', background: '#F5F2EC', borderRadius: '100px', fontSize: '9px', color: '#A09070', letterSpacing: '2px', fontFamily: 'Montserrat', fontWeight: 500, marginBottom: '20px' }}>
                {ANGLE_CONFIG[activeAngle].description}
              </span>
              <p style={{ fontSize: '16px', lineHeight: 1.9, color: '#2A1E0A', fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, whiteSpace: 'pre-wrap', marginBottom: '28px' }}>
                {angles[activeAngle]}
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => handleCopy(activeAngle)} className="btn-outline" style={{ flex: 1, padding: '13px', borderRadius: '12px', fontSize: '10px', letterSpacing: '2px', fontFamily: 'Montserrat', fontWeight: 600, color: '#7A6840', cursor: 'pointer' }}>
                  {copied === activeAngle ? '✓ COPIED' : '⎘ COPY'}
                </button>
                <button onClick={() => handleSave(activeAngle)} disabled={saved[activeAngle]} className={saved[activeAngle] ? '' : 'btn-gold'} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: 'none', fontSize: '10px', letterSpacing: '2px', fontFamily: 'Montserrat', fontWeight: 600, color: saved[activeAngle] ? '#A09070' : '#2A1800', background: saved[activeAngle] ? '#F5F2EC' : undefined, cursor: saved[activeAngle] ? 'default' : 'pointer' }}>
                  {saved[activeAngle] ? '✓ ARCHIVED' : '◈ ARCHIVE'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VAULT */}
        <div className="fade-up-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 500, color: '#1A1208', letterSpacing: '1px' }}>The Vault</span>
            <div className="gold-line" style={{ flex: 1 }} />
            <span className="gold-badge">{history.length} pieces</span>
          </div>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '72px 32px', background: '#FFFFFF', border: '2px dashed #EDE8DE', borderRadius: '20px' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px', opacity: 0.15 }}>◈</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 400, color: '#1A1208', marginBottom: '8px' }}>Your vault awaits</div>
              <div style={{ fontSize: '12px', color: '#C4B99A', fontFamily: 'Montserrat', fontWeight: 300 }}>Upload your first call to begin building your authority archive</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {history.map((post) => (
                <div key={post.id} className="vault-card" style={{ padding: '22px 28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span className="gold-badge" style={{ color: ANGLE_CONFIG[post.narrative_type]?.color || '#C9A84C' }}>
                      {ANGLE_CONFIG[post.narrative_type]?.icon} {ANGLE_CONFIG[post.narrative_type]?.label || post.narrative_type?.toUpperCase()}
                    </span>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: '11px', color: '#C4B99A', fontFamily: 'Montserrat' }}>{new Date(post.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <p style={{ fontSize: '14px', color: '#7A6840', lineHeight: 1.7, fontFamily: "'Cormorant Garamond', serif", fontWeight: 400 }}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,18,8,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(16px)' }}>
          <div className="card fade-up" style={{ padding: '52px 44px', maxWidth: '440px', width: '90%', textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'linear-gradient(135deg, #D4AF37, #A07820)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '26px', boxShadow: '0 8px 28px rgba(201,168,76,0.4)' }}>✦</div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 400, color: '#1A1208', marginBottom: '10px', lineHeight: 1.2 }}>
              Your free genius<br /><em style={{ color: '#C9A84C' }}>is exhausted.</em>
            </h2>
            <p style={{ fontSize: '13px', color: '#A09070', fontFamily: 'Montserrat', fontWeight: 300, marginBottom: '28px', lineHeight: 1.7 }}>
              Join the founders building their authority on LinkedIn every day.
            </p>
            <div style={{ padding: '20px', background: 'linear-gradient(135deg, #FFFEF9, #FFF8E6)', borderRadius: '14px', marginBottom: '24px', border: '1px solid rgba(201,168,76,0.2)' }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '44px', fontWeight: 600, color: '#C9A84C' }}>
                $79<span style={{ fontSize: '16px', color: '#A09070', fontFamily: 'Montserrat', fontWeight: 300 }}>/month</span>
              </div>
              <div style={{ fontSize: '10px', color: '#8C6A1A', fontFamily: 'Montserrat', letterSpacing: '1.5px', marginTop: '4px' }}>
                EARLY BIRD · UNLIMITED · FULL VAULT · PRIORITY ACCESS
              </div>
            </div>
            <button onClick={handleUpgrade} disabled={upgradeLoading} className="btn-gold" style={{ width: '100%', padding: '16px', borderRadius: '14px', color: '#2A1800', fontSize: '11px', letterSpacing: '3px', fontFamily: 'Montserrat', fontWeight: 700, cursor: 'pointer', marginBottom: '12px' }}>
              {upgradeLoading ? 'REDIRECTING...' : 'UPGRADE TO PRO →'}
            </button>
            <button onClick={() => setShowUpgradeModal(false)} style={{ background: 'none', border: 'none', color: '#C4B99A', fontSize: '12px', fontFamily: 'Montserrat', cursor: 'pointer' }}>
              maybe later
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid #EDE8DE', padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(250,250,248,0.8)' }}>
        <span style={{ fontSize: '10px', color: '#C4B99A', fontFamily: 'Montserrat', letterSpacing: '2px' }}>GHOSTSAAS © 2026</span>
        <div className="gold-line" style={{ flex: 1, margin: '0 24px' }} />
        <span style={{ fontSize: '10px', color: '#C4B99A', fontFamily: 'Montserrat', letterSpacing: '2px' }}>AUTHORITY INTELLIGENCE</span>
      </footer>
    </div>
  );
}