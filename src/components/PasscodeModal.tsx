'use client';

import React, { useState, useEffect } from 'react';
import { KeyRound, ShieldCheck, UserCheck, ArrowRight, RefreshCw, Lock } from 'lucide-react';
import { User } from '@/lib/db';

interface PasscodeModalProps {
  mode: 'gate' | 'switcher';
  onLogin: (code: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export default function PasscodeModal({ mode, onLogin, loading, error }: PasscodeModalProps) {
  const [code, setCode] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  // Fetch created users for quick account switching in 'switcher' mode
  const fetchAvailableUsers = async () => {
    if (mode !== 'switcher') return;
    setFetchingUsers(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users) {
        setAvailableUsers(data.users);
      }
    } catch {
      // Ignored
    } finally {
      setFetchingUsers(false);
    }
  };

  useEffect(() => {
    if (mode === 'switcher') {
      fetchAvailableUsers();
    }
  }, [mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      onLogin(code.trim());
    }
  };

  const handleQuickFill = (sampleCode: string) => {
    setCode(sampleCode);
    onLogin(sampleCode);
  };

  // MODE 1: Master Link Visit Password Card (Matches screenshot layout)
  if (mode === 'gate') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-[#4b7ded] via-[#635de6] to-[#7f46d9] animate-fadeIn">
        <div className="w-full max-w-[340px] bg-[#f8f9fa] rounded-2xl shadow-2xl p-8 flex flex-col items-center">
          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-8 tracking-tight text-center">
            Login
          </h1>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-6">
            <div className="relative border-b border-gray-300 focus-within:border-indigo-600 transition-colors pb-1">
              <input
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Password"
                className="w-full bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none text-base py-1 font-sans"
                autoFocus
              />
            </div>

            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs text-center font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full bg-gradient-to-r from-[#3993eb] to-[#8c3ecc] hover:opacity-95 active:scale-[0.99] disabled:opacity-50 text-white font-medium py-2.5 rounded-lg shadow-md transition-all flex items-center justify-center text-base"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Login'
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 text-center text-xs text-gray-500 space-y-1.5 font-normal">
            <div>
              Forgot <span className="text-[#3993eb] hover:underline cursor-pointer">Password?</span>
            </div>
            <div>
              Don't have an account?{' '}
              <span className="text-[#3993eb] font-semibold hover:underline cursor-pointer">
                Sign up
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MODE 2: Account Selection / Switcher Modal (Original account switcher format)
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
            Select an account below or enter your Passcode to start chatting.
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
                  placeholder="e.g. 0796 or ADMIN123"
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

          {/* Real Available User Account Switcher Badges */}
          <div className="border-t border-slate-800 pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-400">
                Available Accounts (Click to switch):
              </p>
              <button
                type="button"
                onClick={fetchAvailableUsers}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${fetchingUsers ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {availableUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickFill(u.code)}
                  className="flex flex-col items-center justify-center p-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 rounded-xl text-left transition-all group"
                >
                  {u.role === 'admin' ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                  ) : (
                    <UserCheck className="w-4 h-4 text-indigo-400 mb-1 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="text-[11px] font-semibold text-slate-200 truncate max-w-full">
                    {u.avatar} {u.name}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400/90 mt-0.5">
                    {u.code}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
