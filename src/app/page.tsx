'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PasscodeModal from '@/components/PasscodeModal';
import ContactsSidebar from '@/components/ContactsSidebar';
import ChatWindow from '@/components/ChatWindow';
import AdminDashboard from '@/components/AdminDashboard';
import BeautyWebsite from '@/components/BeautyWebsite';
import { User, Message } from '@/lib/db';
import { encryptText, decryptText, isEncrypted } from '@/lib/crypto';
import { MessageSquare, Shield } from 'lucide-react';

export default function HomePage() {
  // Disguise Mode (@1234 password trigger)
  const [isDisguiseMode, setIsDisguiseMode] = useState<boolean>(false);

  // Trigger Panic / Disguise Mode immediately
  const handlePanic = useCallback(() => {
    setIsDisguiseMode(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('chatpass_disguise', 'true');
    }
  }, []);

  // Global Escape key shortcut for instant Panic / Disguise Mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handlePanic();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlePanic]);

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

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [mobileView, setMobileView] = useState<'contacts' | 'chat'>('contacts');

  // Dark / Light Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('chatpass_theme') as 'dark' | 'light' | null;
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(savedTheme);
      } else {
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem('chatpass_theme', next);
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(next);
      }
      return next;
    });
  }, []);

  // Ref to track in-flight message polling AbortController
  const abortControllerRef = useRef<AbortController | null>(null);
  const deletedMessageIdsRef = useRef<Set<string>>(new Set());

  // Real-time silent notification toast state (no ringing sound)
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef<boolean>(true);
  const [incomingNotifications, setIncomingNotifications] = useState<{
    id: string;
    senderName: string;
    senderAvatar: string;
    text: string;
    contact: User;
    time: string;
  }[]>([]);

  // Request browser notification permission on initial user action
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Auto-dismiss oldest notification after 5s
  useEffect(() => {
    if (incomingNotifications.length > 0) {
      const timer = setTimeout(() => {
        setIncomingNotifications((prev) => prev.slice(1));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [incomingNotifications]);

  // Derived Active Contact Object (stable primitive string lookup)
  const activeContact = useMemo(
    () => users.find((u) => u.id === activeContactId) || null,
    [users, activeContactId]
  );

  // Helper to load & save cached messages per conversation (0ms instant display)
  const getCachedMessages = useCallback((userId: string, contactId: string): Message[] => {
    if (typeof window === 'undefined' || !userId || !contactId) return [];
    try {
      const cached = sessionStorage.getItem(`chatpass_cache_msgs_${userId}_${contactId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          // Never return raw encrypted ciphertext from cache
          return parsed.map((m: Message) => {
            if (m.text && isEncrypted(m.text)) {
              return { ...m, text: '' };
            }
            return m;
          });
        }
      }
    } catch {
      // Ignored
    }
    return [];
  }, []);

  const setCachedMessages = useCallback((userId: string, contactId: string, msgs: Message[]) => {
    if (typeof window === 'undefined' || !userId || !contactId) return;
    try {
      sessionStorage.setItem(`chatpass_cache_msgs_${userId}_${contactId}`, JSON.stringify(msgs));
    } catch {
      // Ignored
    }
  }, []);

  // Helper function to safely merge & deduplicate messages by ID
  const mergeMessages = useCallback((existingMsgs: Message[], incomingMsgs: Message[]): Message[] => {
    const map = new Map<string, Message>();

    // Add existing messages to map
    existingMsgs.forEach((m) => {
      if (m && m.id) {
        map.set(m.id, m);
      }
    });

    // Merge incoming messages, matching or replacing optimistic temp messages
    incomingMsgs.forEach((m) => {
      if (!m || !m.id) return;
      // If there is an optimistic temp message matching this confirmed message, replace it
      for (const [key, ex] of map.entries()) {
        if (
          key.startsWith('temp_') &&
          ex.senderId === m.senderId &&
          ex.receiverId === m.receiverId &&
          (ex.text || '') === (m.text || '') &&
          Math.abs(new Date(ex.createdAt).getTime() - new Date(m.createdAt).getTime()) < 15000
        ) {
          map.delete(key);
          break;
        }
      }
      map.set(m.id, m);
    });

    return Array.from(map.values()).sort((a, b) => {
      const tA = new Date(a.createdAt).getTime();
      const tB = new Date(b.createdAt).getTime();
      if (tA !== tB) return tA - tB;
      return (a.id || '').localeCompare(b.id || '');
    });
  }, []);

  // Master Link Gate State
  const [isLinkUnlocked, setIsLinkUnlocked] = useState<boolean>(true);

  // Verify Passcode Login & Update Tab Session State
  const handleLogin = async (code: string): Promise<boolean> => {
    setAuthLoading(true);
    setAuthError(null);

    const trimmedCode = code.trim();
    if (trimmedCode === '@1234' || trimmedCode === '1234') {
      setIsDisguiseMode(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('chatpass_disguise', 'true');
      }
      setAuthLoading(false);
      return true;
    }

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmedCode }),
        cache: 'no-store'
      });
      const data = await res.json();

      if (!res.ok || data.error || !data.user) {
        setAuthError(data.error || 'Invalid password / passcode');
        return false;
      }

      setIsDisguiseMode(false);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('chatpass_disguise');
      }

      setIsLinkUnlocked(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('chatpass_link_unlocked', 'true');
      }

      setCurrentUser(data.user);
      sessionStorage.setItem('chatpass_user_code', data.user.code);

      // Reset notification tracking for clean slate on login / account switch
      isInitialLoadRef.current = true;
      knownMessageIdsRef.current.clear();
      setIncomingNotifications([]);

      // Fetch fresh contacts list for the newly signed in user
      fetch(`/api/users?userId=${data.user.id}&_t=${Date.now()}`, { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => {
          if (d.users && Array.isArray(d.users)) {
            setUsers(d.users);
          }
        })
        .catch(() => {});

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
    if (currentUser) {
      fetch('/api/users/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, status: 'offline' })
      }).catch(() => {});
    }
    sessionStorage.removeItem('chatpass_user_code');
    sessionStorage.removeItem('chatpass_disguise');
    localStorage.removeItem('chatpass_user_code');
    isInitialLoadRef.current = true;
    knownMessageIdsRef.current.clear();
    setIncomingNotifications([]);
    setCurrentUser(null);
    setActiveContactId(null);
    setMessages([]);
    setMobileView('contacts');
  };

  // Direct Account Switch Flow
  const handleSwitchUser = async (targetCode: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (currentUser) {
      fetch('/api/users/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, status: 'offline' })
      }).catch(() => {});
    }
    setActiveContactId(null);
    setMessages([]);
    setShowAdminModal(false);
    setMobileView('contacts');
    await handleLogin(targetCode);
  };

  // Session verification on load: ensure login logic is strictly required whenever opening or refreshing
  useEffect(() => {
    let ignore = false;
    const disguise = typeof window !== 'undefined' ? sessionStorage.getItem('chatpass_disguise') === 'true' : false;
    if (disguise) {
      setIsDisguiseMode(true);
    }

    // Always clear persisted user code on refresh/open so login is strictly required every time
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('chatpass_user_code');
      localStorage.removeItem('chatpass_user_code');
    }

    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('code');

    // Only auto-verify if an explicit code was passed in the URL query (?code=...)
    if (codeFromUrl && !disguise) {
      fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeFromUrl }),
        cache: 'no-store'
      })
        .then((res) => res.json())
        .then((data) => {
          if (!ignore) {
            if (data.success && data.user) {
              setIsLinkUnlocked(true);
              setCurrentUser(data.user);
              if (typeof window !== 'undefined') {
                window.history.replaceState({}, document.title, window.location.pathname);
              }
            }
            setInitialChecking(false);
          }
        })
        .catch(() => {
          if (!ignore) setInitialChecking(false);
        });
    } else {
      // Whenever someone opens the link or refreshes the page, direct straight to login logic
      setCurrentUser(null);
      setIsLinkUnlocked(true);
      setInitialChecking(false);
    }

    return () => { ignore = true; };
  }, []);

  // Mark messages as read for active contact
  const markAsRead = useCallback(async (contactId: string) => {
    if (!currentUser || !contactId) return;
    try {
      await fetch('/api/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: contactId,
          receiverId: currentUser.id
        }),
        cache: 'no-store'
      });
    } catch {
      // Ignored
    }
  }, [currentUser]);

  // Poll Users & Contact List Status with Silent Realtime Notification Detection
  const fetchUsers = useCallback(async () => {
    if (!currentUser) return;
    try {
      const url = `/api/users?userId=${currentUser.id}${activeContactId ? `&activeContactId=${activeContactId}` : ''}&_t=${Date.now()}`;
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      if (data.users && Array.isArray(data.users)) {
        setUsers(data.users);

        const newToasts: {
          id: string;
          senderName: string;
          senderAvatar: string;
          text: string;
          contact: User;
          time: string;
        }[] = [];
        let totalUnread = 0;

        for (const u of data.users) {
          totalUnread += u.unreadCount || 0;
          // Collect all unread messages for this user to trigger a toast for each one
          const candidateMsgs: Message[] = (u.unreadMessages && Array.isArray(u.unreadMessages) && u.unreadMessages.length > 0)
            ? u.unreadMessages
            : (u.lastMessage && u.lastMessage.senderId !== currentUser.id && (u.unreadCount || 0) > 0 ? [u.lastMessage] : []);

          for (const m of candidateMsgs) {
            if (!knownMessageIdsRef.current.has(m.id)) {
              knownMessageIdsRef.current.add(m.id);
              newToasts.push({
                id: m.id,
                senderName: u.name,
                senderAvatar: u.avatar || '👤',
                text: m.text || (m.image ? '📷 Sent a photo' : m.audio ? '🎙️ Voice note' : 'New message'),
                contact: u,
                time: new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              });
            }
          }
        }

        if (newToasts.length > 0) {
          // Strictly SILENT: Do not play any notification sound or ring
          setIncomingNotifications((prev) => [...prev.slice(-4), ...newToasts]);

          // Dispatch silent browser desktop notification if permission granted (not on first load)
          if (!isInitialLoadRef.current && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            for (const t of newToasts) {
              try {
                new Notification(t.senderName, {
                  body: t.text,
                  icon: '/favicon.ico',
                  silent: true
                });
              } catch {}
            }
          }
        }
        isInitialLoadRef.current = false;

        // Update document title with unread count
        if (typeof document !== 'undefined') {
          if (totalUnread > 0) {
            document.title = `(${totalUnread}) New Message - ChatPass`;
          } else {
            document.title = 'ChatPass';
          }
        }
      }
    } catch {
      // Ignored
    }
  }, [currentUser, activeContactId]);

  // Poll Conversation Messages (with deduplication, caching & cancellation)
  const fetchMessages = useCallback(async () => {
    if (!currentUser || !activeContactId) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch(
        `/api/messages?userId=${currentUser.id}&contactId=${activeContactId}&_t=${Date.now()}`,
        {
          cache: 'no-store',
          signal: controller.signal
        }
      );
      const data = await res.json();
      if (data.messages && !controller.signal.aborted) {
        // Filter out locally deleted messages and decrypt any legacy text
        const validMessages = data.messages.filter((m: Message) => !deletedMessageIdsRef.current.has(m.id));
        const decryptedMessages: Message[] = await Promise.all(
          validMessages.map(async (m: Message) => {
            if (m.text && isEncrypted(m.text)) {
              try {
                const plain = await decryptText(m.text, m.senderId || currentUser.id, m.receiverId || activeContactId);
                return { ...m, text: plain && !isEncrypted(plain) ? plain : '' };
              } catch {
                return { ...m, text: '' };
              }
            }
            return m;
          })
        );

        setMessages((prevMsgs) => {
          const merged = mergeMessages(prevMsgs, decryptedMessages);
          setCachedMessages(currentUser.id, activeContactId, merged);
          return merged;
        });

        // Instantly synchronize the active contact's lastMessage in the sidebar
        if (decryptedMessages.length > 0) {
          const latestMsg = decryptedMessages[decryptedMessages.length - 1];
          setUsers((prevUsers) =>
            prevUsers.map((u) => {
              if (u.id === activeContactId) {
                return {
                  ...u,
                  lastMessage: latestMsg,
                  unreadCount: 0
                };
              }
              return u;
            })
          );
        }

        markAsRead(activeContactId);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error polling messages:', err);
      }
    }
  }, [currentUser, activeContactId, mergeMessages, markAsRead, setCachedMessages]);

  // Periodic user list polling (2.5s)
  useEffect(() => {
    if (!currentUser) return;

    const timer = setTimeout(() => {
      fetchUsers();
    }, 0);

    const userInterval = setInterval(fetchUsers, 2000);

    return () => {
      clearTimeout(timer);
      clearInterval(userInterval);
    };
  }, [currentUser, fetchUsers]);

  // Tab Unload / Close Beacon (Instantly marks user offline when closing tab or navigating away)
  useEffect(() => {
    if (!currentUser) return;

    const markOffline = () => {
      const payload = JSON.stringify({ userId: currentUser.id, status: 'offline' });
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/users/status', payload);
      } else {
        fetch('/api/users/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true
        }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', markOffline);
    return () => {
      window.removeEventListener('beforeunload', markOffline);
    };
  }, [currentUser]);

  // Periodic message polling (1.0s fast interval) with cleanup
  useEffect(() => {
    if (!currentUser || !activeContactId) return;

    // Load cached messages instantly (0ms delay on refresh)
    const cached = getCachedMessages(currentUser.id, activeContactId);
    if (cached.length > 0) {
      setMessages(cached);
      setMessagesLoading(false);
    } else {
      setMessagesLoading(true);
    }

    fetchMessages().finally(() => setMessagesLoading(false));

    const msgInterval = setInterval(fetchMessages, 1000);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      clearInterval(msgInterval);
    };
  }, [currentUser, activeContactId, fetchMessages, getCachedMessages]);

  const handleTyping = useCallback(async (isTyping: boolean) => {
    if (!currentUser || !activeContactId) return;
    try {
      await fetch('/api/users/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          targetId: activeContactId,
          isTyping
        })
      });
    } catch {
      // Ignored
    }
  }, [currentUser, activeContactId]);

  const handleDeleteMessage = useCallback((messageId: string, mode: 'everyone' | 'me' = 'everyone') => {
    if (!currentUser || !activeContactId) return;
    
    // 0ms instant removal from UI
    deletedMessageIdsRef.current.add(messageId);
    setMessages((prev) => {
      const updated = prev.filter((m) => m.id !== messageId);
      setCachedMessages(currentUser.id, activeContactId, updated);
      return updated;
    });

    // Asynchronous non-blocking background server deletion
    fetch(`/api/messages?messageId=${encodeURIComponent(messageId)}&mode=${mode}&userId=${encodeURIComponent(currentUser.id)}`, {
      method: 'DELETE',
      cache: 'no-store'
    }).catch((err) => {
      console.error('Failed to delete message:', err);
    });
  }, [currentUser, activeContactId, setCachedMessages]);

  const handleClearChat = async () => {
    if (!currentUser || !activeContactId) return;
    try {
      await fetch('/api/messages/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, contactId: activeContactId }),
        cache: 'no-store'
      });
      setMessages([]);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(`chatpass_cache_msgs_${currentUser.id}_${activeContactId}`);
      }
      fetchUsers();
    } catch (err) {
      console.error('Failed to clear chat:', err);
    }
  };

  const handleSendMessage = async (text: string, image?: string, video?: string, audio?: string) => {
    if (!currentUser || !activeContactId) return;

    // Reset typing immediately when message is sent
    handleTyping(false);

    // Create instant optimistic message for 0ms sending experience
    const tempId = `temp_msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const plainText = text ? text.trim() : '';
    const optimisticMsg: Message = {
      id: tempId,
      senderId: currentUser.id,
      receiverId: activeContactId,
      text: plainText,
      image: image || undefined,
      video: video || undefined,
      audio: audio || undefined,
      createdAt: new Date().toISOString(),
      read: false
    };

    // Render message instantly in UI (0ms delay!)
    setMessages((prev) => {
      const merged = mergeMessages(prev, [optimisticMsg]);
      setCachedMessages(currentUser.id, activeContactId, merged);
      return merged;
    });

    // Instantly update sidebar contact lastMessage so it displays on sidebar immediately!
    setUsers((prevUsers) =>
      prevUsers.map((u) => {
        if (u.id === activeContactId) {
          return {
            ...u,
            lastMessage: optimisticMsg
          };
        }
        return u;
      })
    );

    try {
      // Send clean plain text directly over the wire
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser.id,
          receiverId: activeContactId,
          text: plainText,
          image,
          video,
          audio
        }),
        cache: 'no-store'
      });

      const data = await res.json();
      if (data.message) {
        const confirmedMsg: Message = {
          ...data.message,
          text: plainText
        };
        setMessages((prev) => {
          // Replace optimistic message with confirmed server message
          const filtered = prev.filter((m) => m.id !== tempId);
          const merged = mergeMessages(filtered, [confirmedMsg]);
          setCachedMessages(currentUser.id, activeContactId, merged);
          return merged;
        });
        setUsers((prevUsers) =>
          prevUsers.map((u) => {
            if (u.id === activeContactId) {
              return {
                ...u,
                lastMessage: confirmedMsg
              };
            }
            return u;
          })
        );
        fetchUsers();
      }
    } catch {
      // Ignored
    }
  };

  const handleSelectContact = async (contact: User) => {
    if (activeContactId !== contact.id) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setActiveContactId(contact.id);

      // Load cached messages instantly (0ms delay!)
      const cached = getCachedMessages(currentUser?.id || '', contact.id);
      if (cached.length > 0) {
        setMessages(cached);
        setMessagesLoading(false);
      } else {
        setMessagesLoading(true);
      }

      markAsRead(contact.id);

      try {
        const res = await fetch(`/api/messages?userId=${currentUser?.id}&contactId=${contact.id}`, { cache: 'no-store' });
        const data = await res.json();
        if (data.messages) {
          const decryptedList: Message[] = await Promise.all(
            data.messages.map(async (m: Message) => {
              if (m.text && isEncrypted(m.text)) {
                try {
                  const plain = await decryptText(m.text, m.senderId || currentUser?.id, m.receiverId || contact.id);
                  return { ...m, text: plain && !isEncrypted(plain) ? plain : '' };
                } catch {
                  return { ...m, text: '' };
                }
              }
              return m;
            })
          );
          const merged = mergeMessages(cached, decryptedList);
          setMessages(merged);
          setCachedMessages(currentUser?.id || '', contact.id, merged);
        }
      } catch {
        // Ignored
      } finally {
        setMessagesLoading(false);
      }
    }
    setMobileView('chat');
  };

  // Loading Screen for initial session check
  if (initialChecking) {
    return (
      <div
        className={`h-screen w-screen flex flex-col items-center justify-center transition-colors ${
          theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-[#f0f2f5] text-[#111b21]'
        }`}
      >
        <div className="w-10 h-10 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
          Connecting to ChatPass...
        </p>
      </div>
    );
  }

  // Disguise Screen (@1234 password trigger renders Premium Beauty Website)
  if (isDisguiseMode) {
    return (
      <BeautyWebsite
        onReset={() => {
          setIsDisguiseMode(false);
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('chatpass_disguise');
          }
        }}
      />
    );
  }

  // Master Link Gate Screen (Mode A: Password format when visiting link for first time)
  if (!isLinkUnlocked) {
    return <PasscodeModal mode="gate" onLogin={handleLogin} loading={authLoading} error={authError} />;
  }

  // Account Switcher Screen (Mode B: Account Selection format when logged out or switching accounts)
  if (!currentUser) {
    return <PasscodeModal mode="switcher" onLogin={handleLogin} loading={authLoading} error={authError} />;
  }

  return (
    <main
      className={`h-screen w-screen overflow-hidden flex flex-col font-sans transition-colors duration-200 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-[#f0f2f5] text-[#111b21]'
      }`}
    >
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
            theme={theme}
            onToggleTheme={toggleTheme}
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
              onDeleteMessage={handleDeleteMessage}
              onClearChat={handleClearChat}
              onTyping={handleTyping}
              onPanic={handlePanic}
              onBack={() => setMobileView('contacts')}
              loading={messagesLoading}
              theme={theme}
              onToggleTheme={toggleTheme}
            />
          ) : (
            <div
              className={`h-full flex flex-col items-center justify-center p-8 text-center transition-colors ${
                theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-[#f0f2f5] text-[#111b21]'
              }`}
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-600/30 mb-6">
                <MessageSquare className="w-10 h-10 text-white" />
              </div>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#111b21]'}`}>
                Your Direct Messages
              </h2>
              <p className={`text-xs mt-2 max-w-sm ${theme === 'dark' ? 'text-slate-400' : 'text-[#667781]'}`}>
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
          onSwitchUser={handleSwitchUser}
        />
      )}

      {/* Stack of Silent Realtime Incoming Notifications on Alpha / User Side */}
      {incomingNotifications.length > 0 && (
        <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-auto">
          {incomingNotifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                handleSelectContact(n.contact);
                setIncomingNotifications((prev) => prev.filter((item) => item.id !== n.id));
              }}
              className="flex items-center gap-3 p-3.5 bg-slate-900/95 dark:bg-slate-900/95 border border-indigo-500/50 text-white rounded-2xl shadow-2xl backdrop-blur-md cursor-pointer hover:scale-102 active:scale-95 transition-all animate-fadeIn"
              style={{ boxShadow: '0 10px 30px -5px rgba(99, 102, 241, 0.4)' }}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xl shrink-0">
                {n.senderAvatar}
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="font-bold text-xs text-indigo-300 truncate">
                    {n.senderName}
                  </h5>
                  <span className="text-[10px] text-slate-400 font-mono">{n.time}</span>
                </div>
                <p className="text-xs text-slate-200 truncate mt-0.5 font-medium">
                  {n.text}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIncomingNotifications((prev) => prev.filter((item) => item.id !== n.id));
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-sm"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
