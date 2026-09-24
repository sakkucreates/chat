'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PasscodeModal from '@/components/PasscodeModal';
import ContactsSidebar from '@/components/ContactsSidebar';
import ChatWindow from '@/components/ChatWindow';
import AdminDashboard from '@/components/AdminDashboard';
import { User, Message } from '@/lib/db';
import { MessageSquare, Shield } from 'lucide-react';

export default function HomePage() {
  // Current Authenticated User Session for this browser tab
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [initialChecking, setInitialChecking] = useState(true);

  // App Data
  const [users, setUsers] = useState<(User & { unreadCount?: number; lastMessage?: Message | null })[]>([]);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Mobile View State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [mobileView, setMobileView] = useState<'contacts' | 'chat'>('contacts');

  // Ref to track in-flight message polling AbortController
  const abortControllerRef = useRef<AbortController | null>(null);

  // Derived Active Contact Object (stable primitive string lookup)
  const activeContact = useMemo(
    () => users.find((u) => u.id === activeContactId) || null,
    [users, activeContactId]
  );

  // Helper function to safely merge & deduplicate messages by ID, sorting chronologically
  const mergeMessages = useCallback((existingMsgs: Message[], incomingMsgs: Message[]): Message[] => {
    const map = new Map<string, Message>();
    existingMsgs.forEach((m) => map.set(m.id, m));
    incomingMsgs.forEach((m) => map.set(m.id, m));
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, []);

  // Verify Passcode Login & Update Tab Session State
  const handleLogin = async (code: string): Promise<boolean> => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
        cache: 'no-store'
      });
      const data = await res.json();

      if (!res.ok || data.error || !data.user) {
        setAuthError(data.error || 'Invalid passcode');
        return false;
      }

      setCurrentUser(data.user);
      sessionStorage.setItem('chatpass_user_code', data.user.code);
      localStorage.setItem('chatpass_user_code', data.user.code);
      return true;
    } catch {
      setAuthError('Connection error. Please try again.');
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  // Explicit Per-Tab Logout Flow
  const handleLogout = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    sessionStorage.removeItem('chatpass_user_code');
    localStorage.removeItem('chatpass_user_code');
    setCurrentUser(null);
    setActiveContactId(null);
    setMessages([]);
    setMobileView('contacts');
  };

  // Session verification on load
  useEffect(() => {
    let ignore = false;
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('code');
    const sessionCode = typeof window !== 'undefined' ? sessionStorage.getItem('chatpass_user_code') : null;
    const localCode = typeof window !== 'undefined' ? localStorage.getItem('chatpass_user_code') : null;

    const codeToVerify = codeFromUrl || sessionCode || localCode;

    if (codeToVerify) {
      fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeToVerify }),
        cache: 'no-store'
      })
        .then((res) => res.json())
        .then((data) => {
          if (!ignore) {
            if (data.success && data.user) {
              setCurrentUser(data.user);
              sessionStorage.setItem('chatpass_user_code', data.user.code);
              localStorage.setItem('chatpass_user_code', data.user.code);
              if (codeFromUrl && typeof window !== 'undefined') {
                window.history.replaceState({}, document.title, window.location.pathname);
              }
            } else {
              sessionStorage.removeItem('chatpass_user_code');
              localStorage.removeItem('chatpass_user_code');
            }
            setInitialChecking(false);
          }
        })
        .catch(() => {
          if (!ignore) setInitialChecking(false);
        });
    } else {
      setInitialChecking(false);
    }

    return () => { ignore = true; };
  }, []);

  // Poll Users & Contact List Status
  const fetchUsers = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/users?userId=${currentUser.id}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch {
      // Ignored
    }
  }, [currentUser]);

  // Poll Conversation Messages (with deduplication & cancellation)
  const fetchMessages = useCallback(async () => {
    if (!currentUser || !activeContactId) return;

    // Abort previous in-flight request if present
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch(
        `/api/messages?userId=${currentUser.id}&contactId=${activeContactId}`,
        {
          cache: 'no-store',
          signal: controller.signal
        }
      );
      const data = await res.json();
      if (data.messages && !controller.signal.aborted) {
        // Merge & deduplicate incoming messages to PREVENT any message from disappearing
        setMessages((prevMsgs) => mergeMessages(prevMsgs, data.messages));
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error polling messages:', err);
      }
    }
  }, [currentUser, activeContactId, mergeMessages]);

  // Periodic user list polling (2.5s)
  useEffect(() => {
    if (!currentUser) return;

    const timer = setTimeout(() => {
      fetchUsers();
    }, 0);

    const userInterval = setInterval(fetchUsers, 2500);

    return () => {
      clearTimeout(timer);
      clearInterval(userInterval);
    };
  }, [currentUser, fetchUsers]);

  // Periodic message polling (1.5s) with cleanup
  useEffect(() => {
    if (!currentUser || !activeContactId) return;

    const timer = setTimeout(() => {
      setMessagesLoading(true);
      fetchMessages().finally(() => setMessagesLoading(false));
    }, 0);

    const msgInterval = setInterval(fetchMessages, 1500);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      clearTimeout(timer);
      clearInterval(msgInterval);
    };
  }, [currentUser, activeContactId, fetchMessages]);

  const handleSendMessage = async (text: string, image?: string) => {
    if (!currentUser || !activeContactId) return;

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser.id,
          receiverId: activeContactId,
          text,
          image
        }),
        cache: 'no-store'
      });

      const data = await res.json();
      if (data.message) {
        // Safely add server-returned message using Map deduplication
        setMessages((prev) => mergeMessages(prev, [data.message]));
        fetchUsers();
      }
    } catch {
      // Ignored
    }
  };

  const handleSelectContact = (contact: User) => {
    if (activeContactId !== contact.id) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setActiveContactId(contact.id);
      setMessages([]);
    }
    setMobileView('chat');
  };

  // Loading Screen for initial session check
  if (initialChecking) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-xs text-slate-400 font-medium">Connecting to ChatPass...</p>
      </div>
    );
  }

  // Passcode Auth Screen if not logged in
  if (!currentUser) {
    return <PasscodeModal onLogin={handleLogin} loading={authLoading} error={authError} />;
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-slate-950 flex flex-col text-slate-100 font-sans">
      <div className="flex-1 flex overflow-hidden">
        {/* Contacts Sidebar */}
        <div
          className={`h-full w-full md:w-auto ${
            mobileView === 'contacts' ? 'block' : 'hidden md:block'
          }`}
        >
          <ContactsSidebar
            currentUser={currentUser}
            users={users}
            activeContact={activeContact}
            onSelectContact={handleSelectContact}
            onOpenAdmin={() => setShowAdminModal(true)}
            onLogout={handleLogout}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </div>

        {/* Chat Window Container */}
        <div
          className={`h-full flex-1 ${
            mobileView === 'chat' ? 'block' : 'hidden md:block'
          }`}
        >
          {activeContact ? (
            <ChatWindow
              key={activeContact.id}
              currentUser={currentUser}
              contact={activeContact}
              messages={messages}
              onSendMessage={handleSendMessage}
              onBack={() => setMobileView('contacts')}
              loading={messagesLoading}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-950 text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-600/30 mb-6">
                <MessageSquare className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Your Direct Messages</h2>
              <p className="text-slate-400 text-xs mt-2 max-w-sm">
                Select any contact from the left sidebar to start chatting as <strong>{currentUser.name}</strong>.
              </p>

              {currentUser.role === 'admin' && (
                <button
                  onClick={() => setShowAdminModal(true)}
                  className="mt-6 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
                >
                  <Shield className="w-4 h-4" />
                  <span>Open Admin Control Panel</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Admin Control Center Modal */}
      {showAdminModal && (
        <AdminDashboard
          onClose={() => {
            setShowAdminModal(false);
            fetchUsers();
          }}
          onSelectUserForChat={(user) => {
            handleSelectContact(user);
          }}
        />
      )}
    </main>
  );
}
