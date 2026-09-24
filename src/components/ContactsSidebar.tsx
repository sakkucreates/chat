'use client';

import React from 'react';
import { Search, Shield, LogOut, MessageSquarePlus, User as UserIcon } from 'lucide-react';
import { User, Message } from '@/lib/db';

interface ContactsSidebarProps {
  currentUser: User;
  users: (User & { unreadCount?: number; lastMessage?: Message | null })[];
  activeContact: User | null;
  onSelectContact: (user: User) => void;
  onOpenAdmin: () => void;
  onLogout: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export default function ContactsSidebar({
  currentUser,
  users,
  activeContact,
  onSelectContact,
  onOpenAdmin,
  onLogout,
  searchQuery,
  setSearchQuery,
}: ContactsSidebarProps) {
  // Filter contacts: ALWAYS exclude current user from their own contact list
  const filteredUsers = users.filter(
    (u) =>
      u.id !== currentUser.id &&
      u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full md:w-80 lg:w-96 bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0">
      {/* Logged-In User Identity Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-2xl shadow-md border border-white/10">
              {currentUser.avatar || '👤'}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-white text-sm sm:text-base leading-tight truncate">
                {currentUser.name}
              </h3>
              {currentUser.role === 'admin' && (
                <span className="bg-indigo-500/20 text-indigo-400 text-[10px] px-1.5 py-0.2 rounded font-semibold border border-indigo-500/30 shrink-0">
                  Admin
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
              <span>Code:</span>
              <strong className="font-mono text-emerald-400">{currentUser.code}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {currentUser.role === 'admin' && (
            <button
              onClick={onOpenAdmin}
              title="Open Admin Control Panel"
              className="p-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition-all"
            >
              <Shield className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onLogout}
            title="Logout & Switch User Account"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/40 text-xs font-medium transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Admin Action Bar */}
      {currentUser.role === 'admin' && (
        <div className="p-3 bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border-b border-indigo-500/20">
          <button
            onClick={onOpenAdmin}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 px-3 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>Create New Chat Account</span>
          </button>
        </div>
      )}

      {/* Search Input */}
      <div className="p-3 border-b border-slate-800/80">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-3 text-slate-500">
              <UserIcon className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-300 font-medium">No other contacts found</p>
            <p className="text-[11px] text-slate-500 mt-1">
              {currentUser.role === 'admin'
                ? 'Click "Create New Chat Account" to add users!'
                : 'Ask Admin to generate another account to chat with.'}
            </p>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isSelected = activeContact?.id === user.id;
            const hasUnread = (user.unreadCount || 0) > 0;

            return (
              <button
                key={user.id}
                onClick={() => onSelectContact(user)}
                className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-all text-left ${
                  isSelected
                    ? 'bg-indigo-600/20 border border-indigo-500/40 shadow-sm'
                    : 'hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl">
                    {user.avatar || '👤'}
                  </div>
                  {user.status === 'online' ? (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                  ) : (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-slate-500 border-2 border-slate-900 rounded-full" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 truncate">
                      <h4 className="text-sm font-semibold text-white truncate">{user.name}</h4>
                      {user.role === 'admin' && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 py-0.2 rounded font-medium">
                          Admin
                        </span>
                      )}
                    </div>
                    {user.lastMessage && (
                      <span className="text-[10px] text-slate-500 shrink-0 ml-1">
                        {formatTime(user.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <p
                      className={`text-xs truncate ${
                        hasUnread ? 'font-bold text-indigo-300' : 'text-slate-400'
                      }`}
                    >
                      {user.lastMessage
                        ? user.lastMessage.text || '📷 Attachment'
                        : 'Tap to start chatting'}
                    </p>

                    {hasUnread && (
                      <span className="ml-2 bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 animate-pulse">
                        {user.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
