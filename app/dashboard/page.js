"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://zynnnyxmwbgzbatphpjh.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5bm5ueXhtd2JnemJhdHBocGpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDk1MzYsImV4cCI6MjA4NzY4NTUzNn0.qCycJ1lej56BMO1Akti2qbPuVi1D1bGYptpskju8vPM"
);

const ANGLE_CONFIG = {
  rant: { label: '⚡ The Rant', color: 'bg-red-600', description: 'Provocateur, contrarian' },
  lesson: { label: '🎓 The Lesson', color: 'bg-blue-600', description: 'Éducatif, actionnable' },
  vision: { label: '🔭 The Vision', color: 'bg-purple-600', description: 'Visionnaire, inspirant' },
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

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) console.error('Fetch error:', error);
    else setHistory(data || []);
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleUpload = async () => {
    if (!file) return alert("Select a video or audio file first");
    if (!email) return alert("Enter your email first");
    setLoading(true);
    setAngles(null);
    setTranscript('');
    setSaved({});

    const formData = new FormData();
    formData.append('file', file);
    formData.append('email', email);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        body: formData,
      });
      const text = await res.text();
      if (!text) throw new Error("Réponse vide du serveur");
      const data = JSON.parse(text);

      if (data.error === 'NO_CREDITS') {
        setShowUpgradeModal(true);
        return;
      }

      if (!res.ok) throw new Error(data.error);
      setAngles(data.angles);
      setTranscript(data.transcript);
      setCreditsRemaining(data.credits_remaining);
    } catch (err) {
      alert("Erreur : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!email) return alert("Enter your email first");
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
    const content = angles[angleKey];
    const { error } = await supabase.from('posts').insert([{
      content_raw: transcript,
      content_ai: content,
      status: 'draft',
      narrative_type: angleKey,
    }]);
    if (error) {
      console.error('Insert error:', error);
    } else {
      setSaved((prev) => ({ ...prev, [angleKey]: true }));
      await fetchHistory();
    }
  };

  const handleCopy = (angleKey) => {
    navigator.clipboard.writeText(angles[angleKey]);
    setCopied(angleKey);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="min-h-screen bg-white p-10 font-sans">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-black italic uppercase">GhostSaaS.ai</h1>
          {creditsRemaining !== null && (
            <span className="font-black text-sm uppercase bg-black text-white px-4 py-2 rounded-full">
              {creditsRemaining} credits left
            </span>
          )}
        </div>
        <p className="text-gray-400 font-medium mb-10">Upload a call. Get 3 angles. Choose your weapon.</p>

        {/* Upgrade Modal */}
        {showUpgradeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-white rounded-[40px] p-12 max-w-md text-center shadow-2xl">
              <span className="text-5xl mb-4 block">⚡</span>
              <h2 className="text-2xl font-black uppercase mb-3">You've used your free genius.</h2>
              <p className="text-gray-400 font-medium mb-8">
                Upgrade to <strong>Growth at $299/mo</strong> to unlock unlimited authority content.
              </p>
              <button
                onClick={handleUpgrade}
                disabled={upgradeLoading}
                className="w-full bg-black text-white font-black py-5 rounded-2xl text-lg hover:bg-blue-600 transition-all mb-3"
              >
                {upgradeLoading ? "REDIRECTING..." : "🚀 UPGRADE TO GROWTH"}
              </button>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="text-gray-400 text-sm font-medium hover:text-black"
              >
                Maybe later
              </button>
            </div>
          </div>
        )}

        {/* Email Input */}
        <div className="mb-6">
          <input
            type="email"
            placeholder="Enter your email to get started..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-2xl px-6 py-4 font-medium text-lg outline-none focus:border-black transition-all"
          />
        </div>

        {/* Upload Zone */}
        <div className="border-2 border-black p-8 rounded-[40px] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] mb-10">
          <div className="border-4 border-dashed border-gray-200 p-10 rounded-3xl text-center mb-6">
            <input
              type="file"
              accept="video/*,audio/*"
              onChange={(e) => setFile(e.target.files[0])}
              className="hidden"
              id="video-upload"
            />
            <label htmlFor="video-upload" className="cursor-pointer">
              <span className="text-5xl mb-4 block">🎥</span>
              <span className="font-black text-gray-400 block uppercase">
                {file ? file.name : "Drop your founder call or voice memo"}
              </span>
            </label>
          </div>
          <button
            onClick={handleUpload}
            disabled={loading}
            className="w-full bg-black text-white font-black py-6 rounded-2xl text-xl hover:bg-blue-600 transition-all"
          >
            {loading ? "ANALYZING YOUR GENIUS..." : "EXTRACT 3 ANGLES"}
          </button>
        </div>

        {/* Transcript */}
        {transcript && (
          <div className="mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-200 text-gray-500 text-sm">
            <p className="font-black uppercase mb-2 text-gray-400">Transcript</p>
            <p>{transcript}</p>
          </div>
        )}

        {/* 3 Angles */}
        {angles && (
          <div className="space-y-6 mb-12">
            <h2 className="text-2xl font-black uppercase">Choose Your Angle</h2>
            {Object.entries(ANGLE_CONFIG).map(([key, config]) => (
              <div key={key} className="border-2 border-gray-100 rounded-[32px] overflow-hidden shadow-sm">
                <div className={`${config.color} text-white p-4`}>
                  <span className="font-black text-lg">{config.label}</span>
                  <span className="text-sm opacity-75 ml-3">{config.description}</span>
                </div>
                <div className="p-6 whitespace-pre-wrap font-medium text-gray-800">
                  {angles[key]}
                </div>
                <div className="p-4 border-t border-gray-100 flex gap-3">
                  <button
                    onClick={() => handleCopy(key)}
                    className="flex-1 py-3 rounded-xl border-2 border-black font-black uppercase text-sm hover:bg-black hover:text-white transition-all"
                  >
                    {copied === key ? "✅ COPIED!" : "📋 COPY"}
                  </button>
                  <button
                    onClick={() => handleSave(key)}
                    disabled={saved[key]}
                    className={`flex-1 py-3 rounded-xl font-black uppercase text-sm transition-all ${
                      saved[key] ? 'bg-green-500 text-white' : 'bg-black text-white hover:bg-green-600'
                    }`}
                  >
                    {saved[key] ? "✅ SAVED!" : "💾 SAVE TO VAULT"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Vault */}
        <h2 className="text-2xl font-black mb-6 uppercase">Vault ({history.length})</h2>
        {history.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-[32px] p-12 text-center">
            <span className="text-5xl mb-4 block">👋</span>
            <h3 className="font-black text-xl uppercase mb-3">Welcome to GhostSaaS</h3>
            <p className="text-gray-400 font-medium mb-2">Your Vault is empty.</p>
            <p className="text-gray-400 font-medium">
              Drop your last Zoom recording or voice memo above.<br/>
              We'll build your Authority Profile in 60 seconds.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((post) => (
              <div key={post.id} className="p-6 border border-gray-100 rounded-2xl bg-white shadow-sm">
                <span className={`text-xs font-black uppercase px-3 py-1 rounded-full text-white mb-3 inline-block ${
                  ANGLE_CONFIG[post.narrative_type]?.color || 'bg-gray-400'
                }`}>
                  {ANGLE_CONFIG[post.narrative_type]?.label || post.narrative_type}
                </span>
                <p className="font-medium text-gray-800 mt-2">{post.content_ai}</p>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}