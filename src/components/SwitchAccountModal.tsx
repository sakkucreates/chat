'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Lock, KeyRound, Eye, EyeOff, Users, RefreshCw, Shield, User as UserIcon, X } from 'lucide-react';
import { User } from '@/lib/db';

interface SwitchAccountModalProps {
  onClose: () => void;
  onSwitchUser: (userCode: string) => Promise<boolean> | void;
  onOpenCreate?: () => void;
}

export default function SwitchAccountModal({
  onClose,
  onSwitchUser,
  onOpenCreate
}: SwitchAccountModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/users?_t=${Date.now()}`);
      const data = await res.json();
      if (data.users && Array.isArray(data.users)) {
        setUsers(data.users);
      }
    } catch {
      // Ignored
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const success = await onSwitchUser(password.trim());
      if (success === false) {
        setError('Invalid passcode / password');
      } else {
        onClose();
      }
    } catch {
      setError('Failed to switch account');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = async (userCode: string) => {
    setLoading(true);
    setError(null);
    try {
      const success = await onSwitchUser(userCode);
      if (success !== false) {
        onClose();
      }
    } catch {
      setError('Failed to switch account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-[380px] bg-[#111b21] border border-[#202c33] rounded-3xl p-6 shadow-2xl text-white relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Lock Icon */}
        <div className="w-14 h-14 rounded-2xl bg-[#00a884]/15 border border-[#00a884]/30 flex items-center justify-center mx-auto mb-3">
          <Lock className="w-7 h-7 text-[#00a884]" />
        </div>

        {/* Header Titles */}
        <h2 className="text-2xl font-bold text-center text-white tracking-tight">
          Switch Account
        </h2>
        <p className="text-xs text-slate-400 text-center mt-1.5 mb-5 leading-relaxed">
          Select an account below to switch, or enter your password.
        </p>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative flex items-center bg-[#182229] border border-[#222d34] focus-within:border-[#00a884] rounded-2xl px-3.5 py-2.5 transition-colors">
              <KeyRound className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-200 ml-2"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs text-center font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full py-3 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-white font-semibold rounded-2xl text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Switch Account'
            )}
          </button>
        </form>

        {/* Links */}
        <div className="text-center mt-3 space-y-1 text-xs">
          <div>
            <span
              onClick={() => setError('Contact Admin or select your account below to switch.')}
              className="text-[#00a884] font-medium hover:underline cursor-pointer"
            >
              Forgot Password?
            </span>
          </div>
          <div className="text-slate-400">
            Don&apos;t have an account?{' '}
            <span
              onClick={() => {
                onClose();
                if (onOpenCreate) onOpenCreate();
              }}
              className="text-[#00a884] font-semibold hover:underline cursor-pointer"
            >
              Sign up
            </span>
          </div>
        </div>

        {/* Select Account Section */}
        <div className="flex items-center justify-between mt-5 mb-2.5 pt-3 border-t border-[#202c33]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            SELECT ACCOUNT
          </span>
          <button
            type="button"
            onClick={fetchUsers}
            disabled={refreshing}
            className="text-xs font-semibold text-[#00a884] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Accounts List */}
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {users.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => handleSelectUser(u.code)}
              className="w-full p-2.5 bg-[#182229] hover:bg-[#202c33] border border-[#222d34] hover:border-[#00a884]/40 rounded-2xl flex items-center justify-between transition-all group cursor-pointer text-left active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-base shrink-0 shadow-xs border border-white/20">
                  {u.avatar || (u.role === 'admin' ? '🛡️' : '👤')}
                </div>
                <span className="font-semibold text-sm text-white truncate">
                  {u.name}
                </span>
              </div>

              <div className="shrink-0 ml-2">
                {u.role === 'admin' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-[#00a884] bg-[#00a884]/15 border border-[#00a884]/40 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    ADMIN
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-300 bg-slate-800 border border-slate-700 flex items-center gap-1">
                    <UserIcon className="w-3 h-3" />
                    USER
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
