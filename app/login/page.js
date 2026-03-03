"use client";
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://zynnnyxmwbgzbatphpjh.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5bm5ueXhtd2JnemJhdHBocGpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDk1MzYsImV4cCI6MjA4NzY4NTUzNn0.qCycJ1lej56BMO1Akti2qbPuVi1D1bGYptpskju8vPM"
);

export default function Login() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('email');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!email) return alert("Entre ton email");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      alert("Erreur : " + error.message);
    } else {
      setStep('otp');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp) return alert("Entre le code");
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email'
    });
    if (error) {
      alert("Erreur : " + error.message);
    } else {
      window.location.href = '/dashboard';
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center font-sans">
      <div className="max-w-md w-full mx-auto p-10">
        <h1 className="text-3xl font-black italic uppercase mb-2">GhostSaaS.ai</h1>
        <p className="text-gray-400 font-medium mb-10">Your LinkedIn authority engine.</p>

        <div className="border-2 border-black p-8 rounded-[40px] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          {step === 'email' ? (
            <>
              <p className="font-black uppercase text-sm mb-3 text-gray-500">Enter your email</p>
              <input
                type="email"
                placeholder="founder@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-2xl px-6 py-4 font-medium text-lg outline-none focus:border-black transition-all mb-6"
              />
              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full bg-black text-white font-black py-5 rounded-2xl text-lg hover:bg-blue-600 transition-all"
              >
                {loading ? "SENDING..." : "GET CODE →"}
              </button>
            </>
          ) : (
            <>
              <p className="font-black uppercase text-sm mb-1 text-gray-500">Check your email</p>
              <p className="text-gray-400 mb-6 text-sm">Enter the 6-digit code sent to <strong>{email}</strong></p>
              <input
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-2xl px-6 py-4 font-medium text-lg outline-none focus:border-black transition-all mb-6 text-center tracking-widest"
                maxLength={6}
              />
              <button
                onClick={handleVerifyOtp}
                disabled={loading}
                className="w-full bg-black text-white font-black py-5 rounded-2xl text-lg hover:bg-blue-600 transition-all"
              >
                {loading ? "VERIFYING..." : "ACCESS DASHBOARD →"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}