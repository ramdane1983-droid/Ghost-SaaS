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

// Convertir AudioBuffer en WAV
const audioBufferToWav = (buffer) => {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const dataLength = buffer.length * numChannels * (bitDepth / 8);
  const arrayBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  const channelData = buffer.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }

  return arrayBuffer;
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
      const formData = new FormData();

      // Si c'est une vidéo → extraire l'audio côté client
      const isVideo = file.type.startsWith('video/') ||
        file.name.toLowerCase().endsWith('.mov') ||
        file.name.toLowerCase().endsWith('.mp4');

      if (isVideo) {
        const arrayBuffer = await file.arrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const wavBuffer = audioBufferToWav(audioBuffer);
        const audioBlob = new Blob([wavBuffer], { type: 'audio/wav' });
        const audioFile = new File([audioBlob], 'audio.wav', { type: 'audio/wav' });
        formData.append('file', audioFile);
      } else {
        formData.append('file', file);
      }

      formData.append('email', email);

      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
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