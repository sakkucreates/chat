'use client';

import React, { useState } from 'react';

interface PasscodeModalProps {
  onLogin: (code: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export default function PasscodeModal({ onLogin, loading, error }: PasscodeModalProps) {
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      onLogin(code.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-[#4b7ded] via-[#635de6] to-[#7f46d9] animate-fadeIn">
      <div className="w-full max-w-[340px] bg-[#f8f9fa] rounded-2xl shadow-2xl p-8 flex flex-col items-center">
        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-8 tracking-tight text-center">
          Login
        </h1>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-6">
          {/* Password Input (No Email field, only Password format) */}
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

          {/* Login Button */}
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
