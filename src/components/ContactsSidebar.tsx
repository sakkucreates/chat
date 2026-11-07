'use client';

import React from 'react';
import { Search, Shield, LogOut, MessageSquarePlus, User as UserIcon, Sun, Moon, Users, ShieldAlert } from 'lucide-react';
import { User, Message } from '@/lib/db';

interface ContactsSidebarProps {
  currentUser: User;
  users: (User & { unreadCount?: number; lastMessage?: Message | null; isTyping?: boolean })[];
  activeContact: User | null;
  onSelectContact: (user: User) => void;
  onOpenAdmin: () => void;
  onSwitchAccount?: () => void;
  onLogout: () => void;
  onPanic?: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export default function ContactsSidebar({
  currentUser,
  users,
  activeContact,
  onSelectContact,
  onOpenAdmin,
  onSwitchAccount,
  onLogout,
  onPanic,
  searchQuery,
  setSearchQuery,
  theme = 'dark',
  onToggleTheme,
}: ContactsSidebarProps) {
  const isLight = theme === 'light';

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
    <div
      className={`w-full md:w-80 lg:w-96 flex flex-col h-full shrink-0 transition-colors duration-200 ${
        isLight
          ? 'bg-white border-r border-[#e9edef] text-[#111b21]'
          : 'bg-[#111b21] border-r border-[#202c33] text-[#e9edef]'
      }`}
    >
      {/* Logged-In User Identity Header */}
      <div
        className={`p-3.5 border-b flex items-center justify-between transition-colors ${
          isLight
            ? 'bg-[#f0f2f5] border-[#e9edef]'
            : 'bg-[#202c33] border-[#222d34]'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-xl shadow-md border border-white/10">
              {currentUser.avatar || '👤'}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 rounded-full ${
                isLight ? 'border-[#f0f2f5]' : 'border-[#202c33]'
              }`}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3
                className={`font-bold text-sm sm:text-base leading-tight truncate ${
                  isLight ? 'text-[#111b21]' : 'text-white'
                }`}
              >
                {currentUser.name}
              </h3>
              {currentUser.role === 'admin' && (
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.2 rounded font-semibold border border-emerald-500/30 shrink-0">
                  Admin
                </span>
              )}
            </div>
            <p className="text-[11px] text-emerald-500 font-medium flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span>Online</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Panic Button */}
          {onPanic && (
            <button
              type="button"
              onClick={onPanic}
              title="Stealth Panic Exit (Esc)"
              className="p-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 transition-all"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>
          )}

          {/* Theme Toggle Button */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              className={`p-2 rounded-xl border transition-all ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-amber-600 border-[#e9edef] shadow-xs'
                  : 'bg-[#111b21] hover:bg-[#2a3942] text-amber-300 border-[#202c33]'
              }`}
            >
              {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={onOpenAdmin}
            title="Open Admin Control Center"
            className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 transition-all"
          >
            <Shield className="w-4 h-4" />
          </button>

          <button
            onClick={onSwitchAccount || onOpenAdmin}
            title="Switch User Account"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
              isLight
                ? 'bg-white hover:bg-emerald-50 text-emerald-700 border-[#e9edef] shadow-xs'
                : 'bg-[#111b21] hover:bg-[#202c33] text-emerald-400 border-[#202c33]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Switch</span>
          </button>

          <button
            onClick={onSwitchAccount || onOpenAdmin}
            title="Switch / Logout"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
              isLight
                ? 'bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border-[#e9edef] shadow-xs'
                : 'bg-[#111b21] hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border-[#202c33]'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Admin Action Bar */}
      {currentUser.role === 'admin' && (
        <div
          className={`p-2.5 border-b ${
            isLight
              ? 'bg-emerald-50/70 border-emerald-100'
              : 'bg-[#182229] border-[#202c33]'
          }`}
        >
          <button
            onClick={onOpenAdmin}
            className="w-full bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all"
          >
            <MessageSquarePlus className="w-4 h-4 text-[#111b21]" />
            <span>Create New Chat Account</span>
          </button>
        </div>
      )}

      {/* Search Input */}
      <div className={`p-2.5 border-b ${isLight ? 'border-[#e9edef]' : 'border-[#202c33]'}`}>
        <div className="relative">
          <Search
            className={`w-4 h-4 absolute left-3 top-2.5 ${
              isLight ? 'text-[#667781]' : 'text-[#8696a0]'
            }`}
          />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#00a884] transition-colors ${
              isLight
                ? 'bg-[#f0f2f5] border border-[#e9edef] text-[#111b21] placeholder:text-[#667781]'
                : 'bg-[#202c33] border border-transparent text-[#e9edef] placeholder:text-[#8696a0]'
            }`}
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div
              className={`w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto mb-3 ${
                isLight
                  ? 'bg-slate-100 border-slate-200 text-slate-400'
                  : 'bg-[#202c33] border-[#222d34] text-[#8696a0]'
              }`}
            >
              <UserIcon className="w-6 h-6" />
            </div>
            <p className={`text-xs font-medium ${isLight ? 'text-slate-600' : 'text-[#8696a0]'}`}>
              No other contacts found
            </p>
            <p className={`text-[11px] mt-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
              {currentUser.role === 'admin'
                ? 'Click "Create New Chat Account" to add users!'
                : 'Ask Admin to generate another account to chat with.'}
            </p>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isSelected = activeContact?.id === user.id;
            const hasUnread = (user.unreadCount || 0) > 0;
            const isOutgoing = user.lastMessage?.senderId === currentUser.id;

            return (
              <button
                key={user.id}
                onClick={() => onSelectContact(user)}
                className={`w-full p-2.5 rounded-xl flex items-center gap-3 transition-all text-left ${
                  isSelected
                    ? isLight
                      ? 'bg-[#f0f2f5] border border-[#d1d7db] shadow-xs'
                      : 'bg-[#2a3942] text-white'
                    : isLight
                    ? 'hover:bg-[#f5f6f6] border border-transparent'
                    : 'hover:bg-[#202c33] border border-transparent'
                }`}
              >
                <div className="relative shrink-0">
                  <div
                    className={`w-10 h-10 rounded-full border flex items-center justify-center text-lg ${
                      isLight
                        ? 'bg-[#dfe5e7] border-[#d1d7db]'
                        : 'bg-[#202c33] border-[#2a3942]'
                    }`}
                  >
                    {user.avatar || '👤'}
                  </div>
                  {user.status === 'online' ? (
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 rounded-full ${
                        isLight ? 'border-white' : 'border-[#111b21]'
                      }`}
                    />
                  ) : (
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-slate-500 border-2 rounded-full ${
                        isLight ? 'border-white' : 'border-[#111b21]'
                      }`}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 truncate">
                      <h4
                        className={`text-sm font-semibold truncate ${
                          isLight ? 'text-[#111b21]' : 'text-[#e9edef]'
                        }`}
                      >
                        {user.name}
                      </h4>
                      {user.role === 'admin' && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-500 px-1 py-0.2 rounded font-medium">
                          Admin
                        </span>
                      )}
                    </div>
                    {user.lastMessage && (
                      <span
                        className={`text-[10px] shrink-0 ml-1 ${
                          isLight ? 'text-[#667781]' : 'text-[#8696a0]'
                        }`}
                      >
                        {formatTime(user.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <p
                      className={`text-xs truncate ${
                        hasUnread
                          ? isLight
                            ? 'font-bold text-[#00a884]'
                            : 'font-bold text-[#00a884]'
                          : isLight
                          ? 'text-[#667781]'
                          : 'text-[#8696a0]'
                      }`}
                    >
                      {user.isTyping ? (
                        <span className="text-[#00a884] font-medium italic animate-pulse">typing...</span>
                      ) : user.lastMessage ? (
                        `${isOutgoing ? 'You: ' : ''}${
                          user.lastMessage.audio ? '🎙️ Voice note' :
                          user.lastMessage.video ? '📹 Video' :
                          user.lastMessage.image ? '📷 Photo' :
                          (user.lastMessage.text && !user.lastMessage.text.startsWith('ENC:')
                            ? user.lastMessage.text
                            : (user.lastMessage.text ? 'Message' : 'Tap to start chatting'))
                        }`
                      ) : (
                        'Tap to start chatting'
                      )}
                    </p>

                    {hasUnread && (
                      <span className="ml-2 bg-[#00a884] text-[#111b21] text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
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
