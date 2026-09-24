'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  UserPlus, 
  Users, 
  Copy, 
  Check, 
  Share2, 
  Trash2, 
  RefreshCw, 
  X, 
  MessageSquare,
  Shield,
  Sparkles,
  Edit2
} from 'lucide-react';
import { User } from '@/lib/db';

interface AdminDashboardProps {
  onClose: () => void;
  onSelectUserForChat: (user: User) => void;
}

const EMOJI_AVATARS = ['👨‍💻', '👩‍💼', '🧑‍🎨', '👨‍🏫', '👩‍🔬', '👨‍🚀', '🐱', '🦊', '🦁', '🐼', '⭐', '🚀'];

export default function AdminDashboard({ onClose, onSelectUserForChat }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [avatar, setAvatar] = useState('👨‍💻');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Newly Created User Share Card
  const [createdUser, setCreatedUser] = useState<User | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch {
      // Ignored
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoadingUsers(true);
      try {
        const res = await fetch('/api/admin/users');
        const data = await res.json();
        if (!ignore && data.users) {
          setUsers(data.users);
        }
      } catch {
        // Ignored
      } finally {
        if (!ignore) setLoadingUsers(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, []);

  const handleGenerateRandomCode = () => {
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    setCode(random);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError('User name is required');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim() || undefined,
          avatar,
          notes: notes.trim(),
          role: 'user'
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setFormError(data.error || 'Failed to create user');
      } else {
        setCreatedUser(data.user);
        setName('');
        setCode('');
        setNotes('');
        fetchUsers();
      }
    } catch {
      setFormError('Network error while creating account');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user account and their chat history?')) return;
    try {
      await fetch(`/api/admin/users?id=${userId}`, { method: 'DELETE' });
      fetchUsers();
    } catch {
      // Ignored
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          name: editingUser.name,
          code: editingUser.code,
          avatar: editingUser.avatar,
          notes: editingUser.notes
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditingUser(null);
        fetchUsers();
      } else {
        alert(data.error || 'Failed to update user');
      }
    } catch {
      alert('Error updating user');
    }
  };

  const getDirectLink = (userCode: string) => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    return `${origin}/?code=${encodeURIComponent(userCode)}`;
  };

  const copyToClipboard = (text: string, type: 'link' | 'code') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Admin Control Center
                <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  Manager
                </span>
              </h2>
              <p className="text-xs text-slate-400">Generate user accounts & manage access passcodes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 p-1.5 px-6 gap-2">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'create'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'manage'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Manage Accounts ({users.length})</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'create' ? (
            <div className="space-y-6">
              {/* Success Share Card after creation */}
              {createdUser ? (
                <div className="p-6 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-2xl space-y-4">
                  <div className="flex items-center gap-3 text-emerald-400">
                    <Sparkles className="w-6 h-6 animate-bounce" />
                    <div>
                      <h3 className="font-bold text-white text-base">Account Created Successfully!</h3>
                      <p className="text-xs text-slate-300">Share these details with {createdUser.name} to let them chat.</p>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                      <span className="text-xs text-slate-400">User Profile</span>
                      <span className="text-sm font-semibold text-white flex items-center gap-2">
                        <span>{createdUser.avatar}</span>
                        <span>{createdUser.name}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                      <span className="text-xs text-slate-400">Passcode</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg font-bold text-emerald-400 tracking-wider">
                          {createdUser.code}
                        </span>
                        <button
                          onClick={() => copyToClipboard(createdUser.code, 'code')}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all text-xs flex items-center gap-1"
                        >
                          {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-slate-400 block mb-1.5">Direct Access Link (No login required)</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={getDirectLink(createdUser.code)}
                          className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 select-all"
                        />
                        <button
                          onClick={() => copyToClipboard(getDirectLink(createdUser.code), 'link')}
                          className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-md"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => {
                        const text = `Hey ${createdUser.name}, here is your chat passcode: *${createdUser.code}*\nOr click this link to start chatting: ${getDirectLink(createdUser.code)}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                      }}
                      className="flex-1 min-w-[140px] bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share on WhatsApp</span>
                    </button>
                    <button
                      onClick={() => setCreatedUser(null)}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-all"
                    >
                      Create Another Account
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateUser} className="space-y-4">
                  {/* Name Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">User Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Michael Scott"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Passcode Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-300">Access Passcode (Optional)</label>
                      <button
                        type="button"
                        onClick={handleGenerateRandomCode}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Auto Generate</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Leave blank for auto-generated 4-digit code"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Avatar Picker */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Avatar Emoji</label>
                    <div className="flex flex-wrap gap-2">
                      {EMOJI_AVATARS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => setAvatar(e)}
                          className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                            avatar === e
                              ? 'bg-indigo-600 border-2 border-white scale-110 shadow-lg'
                              : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Admin Notes (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Sales Client - Project Alpha"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {formError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-medium">
                      {formError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={creating || !name.trim()}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {creating ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Generate & Save Account</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">All Created User Accounts</span>
                <button
                  onClick={fetchUsers}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="space-y-2">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-xl shrink-0">
                        {u.avatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm">{u.name}</h4>
                          {u.role === 'admin' && (
                            <span className="bg-amber-500/20 text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-medium border border-amber-500/30">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 flex items-center gap-2">
                          <span>Code: <strong className="font-mono text-emerald-400">{u.code}</strong></span>
                          {u.notes && <span>• {u.notes}</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => {
                          onSelectUserForChat(u);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>

                      <button
                        onClick={() => copyToClipboard(getDirectLink(u.code), 'link')}
                        title="Copy direct share link"
                        className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl transition-all"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setEditingUser(u)}
                        title="Edit account"
                        className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          title="Delete account"
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Edit Modal Overlay */}
        {editingUser && (
          <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4">
              <h3 className="text-base font-bold text-white">Edit User: {editingUser.name}</h3>
              <form onSubmit={handleUpdateUser} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400">Name</label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Passcode</label>
                  <input
                    type="text"
                    value={editingUser.code}
                    onChange={(e) => setEditingUser({ ...editingUser, code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-white"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
