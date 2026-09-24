'use client';

import React, { useState } from 'react';
import { KeyRound, ShieldCheck, UserCheck, Sparkles, ArrowRight } from 'lucide-react';

interface PasscodeModalProps {
  onLogin: (code: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export default function PasscodeModal({ onLogin, loading, error }: PasscodeModalProps) {
  const [code, setCode] = useState('');

  // Quick helper to fill sample codes
  const handleQuickFill = (sampleCode: string) => {
    setCode(sampleCode);
    onLogin(sampleCode);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      onLogin(code.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header Hero */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-6 sm:p-8 text-white text-center relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-6 -top-6 w-32 h-32 bg-purple-400/20 rounded-full blur-2xl pointer-events-none" />

          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/15 backdrop-blur-md rounded-2xl mb-4 border border-white/20 shadow-inner">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome to ChatPass</h1>
          <p className="text-indigo-100 text-sm mt-1 max-w-xs mx-auto">
            Zero-friction two-way chat. Enter your Passcode provided by Admin to enter instantly.
          </p>
        </div>

        {/* Body Form */}
        <div className="p-6 sm:p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Your Access Code / Passcode
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. 1001 or ADMIN123"
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-2xl px-4 py-3.5 text-center text-xl font-mono tracking-widest text-white placeholder:text-slate-500 placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  maxLength={12}
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 text-center font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white font-semibold py-3.5 px-6 rounded-2xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Enter Chat</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Badges */}
          <div className="border-t border-slate-800 pt-5">
            <p className="text-xs font-medium text-slate-400 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Quick Test Passcodes (Click to test):</span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('ADMIN123')}
                className="flex flex-col items-center justify-center p-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 rounded-xl text-left transition-all group"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-semibold text-slate-300">Admin</span>
                <span className="text-[10px] font-mono text-emerald-400/90">ADMIN123</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('1001')}
                className="flex flex-col items-center justify-center p-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 rounded-xl text-left transition-all group"
              >
                <UserCheck className="w-4 h-4 text-indigo-400 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-semibold text-slate-300">Alex (User)</span>
                <span className="text-[10px] font-mono text-indigo-400/90">1001</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('2002')}
                className="flex flex-col items-center justify-center p-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 rounded-xl text-left transition-all group"
              >
                <UserCheck className="w-4 h-4 text-purple-400 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-semibold text-slate-300">Sarah (User)</span>
                <span className="text-[10px] font-mono text-purple-400/90">2002</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
