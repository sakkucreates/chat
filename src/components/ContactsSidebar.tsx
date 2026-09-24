'use client';

import React from 'react';
import { Search, Shield, LogOut, MessageSquarePlus } from 'lucide-react';
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
  // Filter contacts (exclude current user from list)
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
      {/* User Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-2xl shadow-md">
              {currentUser.avatar}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-white text-sm leading-tight">{currentUser.name}</h3>
              {currentUser.role === 'admin' && (
                <span className="bg-indigo-500/20 text-indigo-400 text-[10px] px-1.5 py-0.2 rounded font-semibold border border-indigo-500/30">
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

        <div className="flex items-center gap-1">
          {currentUser.role === 'admin' && (
            <button
              onClick={onOpenAdmin}
              title="Open Admin Dashboard"
              className="p-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition-all"
            >
              <Shield className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onLogout}
            title="Switch User / Logout"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Admin Action Bar Banner */}
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
            placeholder="Search conversations..."
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
            <p className="text-xs text-slate-400 font-medium">No other users found</p>
            <p className="text-[11px] text-slate-500 mt-1">
              {currentUser.role === 'admin'
                ? 'Click "Create New Chat Account" to add users!'
                : 'Ask Admin to generate accounts for chatting.'}
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
                    {user.avatar}
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
