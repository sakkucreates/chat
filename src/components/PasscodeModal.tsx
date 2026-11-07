'use client';

import React, { useState, useEffect } from 'react';
import { KeyRound, ShieldCheck, UserCheck, ArrowRight, RefreshCw, Lock, UserPlus, Users, ArrowLeft } from 'lucide-react';
import { User } from '@/lib/db';

interface PasscodeModalProps {
  mode: 'gate' | 'switcher';
  onLogin: (code: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

const EMOJI_AVATARS = ['👨‍💻', '👩‍💼', '🧑‍🎨', '👨‍🏫', '👩‍🔬', '👨‍🚀', '🐱', '🦊', '🦁', '🐼', '⭐', '🚀'];

export default function PasscodeModal({ mode, onLogin, loading, error }: PasscodeModalProps) {
  const [view, setView] = useState<'gate' | 'switcher' | 'signup'>(mode);
  const [code, setCode] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  // Sign up form state
  const [signUpName, setSignUpName] = useState('');
  const [signUpCode, setSignUpCode] = useState('');
  const [signUpAvatar, setSignUpAvatar] = useState('👨‍💻');
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [signUpError, setSignUpError] = useState<string | null>(null);

  // Fetch created users for quick account switching
  const fetchAvailableUsers = async () => {
    setFetchingUsers(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users && Array.isArray(data.users)) {
        setAvailableUsers(data.users);
      }
    } catch {
      // Ignored
    } finally {
      setFetchingUsers(false);
    }
  };

  useEffect(() => {
    fetchAvailableUsers();
  }, []);

  useEffect(() => {
    setView(mode);
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

  const handleGenerateRandomSignUpCode = () => {
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    setSignUpCode(random);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError(null);
    if (!signUpName.trim()) {
      setSignUpError('Please enter your full name');
      return;
    }

    setSignUpLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signUpName.trim(),
          code: signUpCode.trim() || undefined,
          avatar: signUpAvatar,
          role: 'user'
        })
      });
      const data = await res.json();
      if (!res.ok || data.error || !data.user) {
        setSignUpError(data.error || 'Failed to create account');
        return;
      }

      // Immediately log into the newly created account!
      await onLogin(data.user.code);
    } catch {
      setSignUpError('Connection error while creating account. Please try again.');
    } finally {
      setSignUpLoading(false);
    }
  };

  // VIEW 1: SIGN UP / CREATE NEW ACCOUNT MODAL
  if (view === 'signup') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-indigo-600 p-6 text-white text-center relative overflow-hidden">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-white/15 backdrop-blur-md rounded-2xl mb-3 border border-white/20 shadow-inner">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Create New Account</h1>
            <p className="text-emerald-100 text-xs mt-1">
              Set up your profile to start messaging instantly.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignUp} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={signUpName}
                onChange={(e) => setSignUpName(e.target.value)}
                placeholder="e.g. Rahul or Sakshi"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Access Passcode (Optional)
                </label>
                <button
                  type="button"
                  onClick={handleGenerateRandomSignUpCode}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Auto Generate</span>
                </button>
              </div>
              <input
                type="text"
                value={signUpCode}
                onChange={(e) => setSignUpCode(e.target.value.toUpperCase())}
                placeholder="Leave blank for auto 4-digit code"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>

            {/* Avatar Picker */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Choose Avatar Emoji
              </label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSignUpAvatar(emoji)}
                    className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${
                      signUpAvatar === emoji
                        ? 'bg-emerald-600 border-2 border-white scale-110 shadow-md'
                        : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {signUpError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 text-center font-medium">
                {signUpError}
              </div>
            )}

            <button
              type="submit"
              disabled={signUpLoading || !signUpName.trim()}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              {signUpLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account & Start Chat</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
              <button
                type="button"
                onClick={() => setView('switcher')}
                className="hover:text-white flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Select Account</span>
              </button>
              <button
                type="button"
                onClick={() => setView('gate')}
                className="hover:text-white transition-colors"
              >
                Enter Password
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // VIEW 2: MASTER LINK VISIT PASSWORD CARD
  if (view === 'gate') {
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
                placeholder="Passcode / Password"
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

            {/* Quick Switch to Account Selection */}
            <button
              type="button"
              onClick={() => {
                setView('switcher');
                fetchAvailableUsers();
              }}
              className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-lg text-indigo-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Select from Available Accounts</span>
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 text-center text-xs text-gray-500 space-y-1.5 font-normal">
            <div>
              Forgot <span className="text-[#3993eb] hover:underline cursor-pointer" onClick={() => setView('switcher')}>Password?</span>
            </div>
            <div>
              Don't have an account?{' '}
              <span
                onClick={() => setView('signup')}
                className="text-[#3993eb] font-semibold hover:underline cursor-pointer"
              >
                Sign up
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // VIEW 3: ACCOUNT SWITCHER & SELECTION MODAL
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
                Your Access Code / Passcode / Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. @2021, ADMIN123, or user name"
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-2xl px-4 py-3.5 text-center text-lg font-mono tracking-wider text-white placeholder:text-slate-500 placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
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

          {/* Action Row: Create Account + Refresh */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setView('signup')}
              className="flex-1 py-2 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
              <span>+ Create New Account</span>
            </button>

            <button
              type="button"
              onClick={() => setView('gate')}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Password Login</span>
            </button>
          </div>

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
                  className="flex flex-col items-center justify-center p-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 rounded-xl text-left transition-all group cursor-pointer active:scale-95"
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
