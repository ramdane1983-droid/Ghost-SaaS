"use client";
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://zynnnyxmwbgzbatphpjh.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5bm5ueXhtd2JnemJhdHBocGpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDk1MzYsImV4cCI6MjA4NzY4NTUzNn0.qCycJ1lej56BMO1Akti2qbPuVi1D1bGYptpskju8vPM"
);

export default function Login() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email) return alert("Entre ton email");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'https://ghost-saa-s.vercel.app/dashboard',
      }
    });
    if (error) {
      alert("Erreur : " + error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center font-sans">
      <div className="max-w-md w-full mx-auto p-10">
        <h1 className="text-3xl font-black italic uppercase mb-2">GhostSaaS.ai</h1>
        <p className="text-gray-400 font-medium mb-10">Your LinkedIn authority engine.</p>

        {sent ? (
          <div className="bg-green-50 border-2 border-green-500 rounded-[32px] p-10 text-center">
            <span className="text-5xl mb-4 block">📧</span>
            <h2 className="font-black text-xl uppercase mb-3">Check your email</h2>
            <p className="text-gray-500 font-medium">
              We sent a magic link to <strong>{email}</strong>.<br/>
              Click it to access your dashboard.
            </p>
          </div>
        ) : (
          <div className="border-2 border-black p-8 rounded-[40px] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
            <p className="font-black uppercase text-sm mb-3 text-gray-500">Enter your email</p>
            <input
              type="email"
              placeholder="founder@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-2xl px-6 py-4 font-medium text-lg outline-none focus:border-black transition-all mb-6"
            />
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-black text-white font-black py-5 rounded-2xl text-lg hover:bg-blue-600 transition-all"
            >
              {loading ? "SENDING..." : "GET MAGIC LINK →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}