'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Image as ImageIcon, 
  Video as VideoIcon,
  Mic,
  Square,
  ShieldAlert,
  ArrowLeft, 
  CheckCheck, 
  Check, 
  Smile, 
  X, 
  Sparkles,
  Lock,
  Phone,
  Video,
  MoreVertical,
  Trash2,
  ChevronDown,
  CornerUpLeft,
  Pin,
  Star,
  Plus,
  Sun,
  Moon
} from 'lucide-react';
import { User, Message } from '@/lib/db';

interface ChatWindowProps {
  currentUser: User;
  contact: User;
  messages: Message[];
  onSendMessage: (text: string, image?: string, video?: string, audio?: string) => Promise<void>;
  onDeleteMessage?: (messageId: string, mode: 'everyone' | 'me') => void;
  onClearChat?: () => Promise<void>;
  onTyping?: (isTyping: boolean) => void;
  onPanic?: () => void;
  onBack: () => void;
  loading: boolean;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '🎉', '👋', '🙏', '✨', '😊', '😍', '🙌', '💯'];
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉'];
const ALL_REACTION_EMOJIS = [
  '👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉', 
  '👏', '💯', '✨', '😍', '🥰', '🤩', '😎', '🤝', 
  '💪', '🥳', '🤔', '👀', '💖', '🚀', '⭐', '🎈'
];

export default function ChatWindow({
  currentUser,
  contact,
  messages,
  onSendMessage,
  onDeleteMessage,
  onClearChat,
  onTyping,
  onPanic,
  onBack,
  loading,
  theme = 'dark',
  onToggleTheme
}: ChatWindowProps) {
  const isLight = theme === 'light';
  const [text, setText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [previewLightbox, setPreviewLightbox] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [localReactions, setLocalReactions] = useState<Record<string, { emoji: string; userId: string }[]>>({});
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);

  // Message actions state (Reply, Pin, Star, Delete, Reactions)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [pinnedMsgId, setPinnedMsgId] = useState<string | null>(null);
  const [starredMsgIds, setStarredMsgIds] = useState<Set<string>>(new Set());
  const [deleteModalMsg, setDeleteModalMsg] = useState<Message | null>(null);
  const [menuDirection, setMenuDirection] = useState<'up' | 'down'>('up');
  const [showReactSubmenu, setShowReactSubmenu] = useState<boolean>(false);

  // Voice note recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Tracks messages with in-flight reaction saves — skip server overwrite for these
  const pendingReactionMsgIds = useRef<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Sync reactions from server polling — but SKIP messages with pending local reactions
  useEffect(() => {
    setLocalReactions(prev => {
      const updated = { ...prev };
      messages.forEach(m => {
        // If this message has a pending in-flight reaction, don't overwrite local state
        if (pendingReactionMsgIds.current.has(m.id)) return;
        // Otherwise sync from server
        updated[m.id] = m.reactions || [];
      });
      return updated;
    });
  }, [messages]);

  const handleReact = async (msgId: string, emoji: string) => {
    const prev = localReactions[msgId] || [];
    const existingIdx = prev.findIndex(r => r.userId === currentUser.id && r.emoji === emoji);
    let next: { emoji: string; userId: string }[];
    if (existingIdx !== -1) {
      next = prev.filter((_, i) => i !== existingIdx);
    } else {
      const sameUser = prev.findIndex(r => r.userId === currentUser.id);
      if (sameUser !== -1) {
        next = prev.map((r, i) => i === sameUser ? { emoji, userId: currentUser.id } : r);
      } else {
        next = [...prev, { emoji, userId: currentUser.id }];
      }
    }
    // Optimistic update immediately
    setLocalReactions(r => ({ ...r, [msgId]: next }));
    setActiveReactionMsgId(null);

    // Mark this message as pending so polling doesn't overwrite our local state
    pendingReactionMsgIds.current.add(msgId);

    try {
      await fetch('/api/messages/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: msgId, userId: currentUser.id, emoji }),
        cache: 'no-store'
      });
    } catch {
      // Ignored
    } finally {
      // Release pending lock after 4 seconds — server will have saved by then
      setTimeout(() => {
        pendingReactionMsgIds.current.delete(msgId);
      }, 4000);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    if (onTyping) {
      onTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        onTyping(false);
      }, 2500);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!text.trim() && !selectedImage && !selectedVideo) || sending) return;

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (onTyping) onTyping(false);

    setSending(true);
    const msgText = text;
    const msgImg = selectedImage;
    const msgVid = selectedVideo;

    setText('');
    setSelectedImage(null);
    setSelectedVideo(null);
    setReplyingTo(null);
    setShowEmojiPicker(false);

    try {
      await onSendMessage(msgText, msgImg || undefined, msgVid || undefined);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      alert('Microphone access is not permitted or not supported by this browser.');
    }
  };

  const stopAndSendRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);

    const recorder = mediaRecorderRef.current;
    recorder.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      recorder.stream.getTracks().forEach((track) => track.stop());

      const reader = new FileReader();
      reader.onload = async () => {
        const audioBase64 = reader.result as string;
        try {
          await onSendMessage('', undefined, undefined, audioBase64);
        } catch (err) {
          console.error('Failed to send voice note:', err);
        }
      };
      reader.readAsDataURL(audioBlob);
    };

    recorder.stop();
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const cancelRecording = () => {
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingSeconds(0);
    audioChunksRef.current = [];
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert('Video file size exceeds 20MB limit');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedVideo(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const formatMessageTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className={`flex-1 flex flex-col h-full relative overflow-hidden transition-colors duration-200 ${
        isLight ? 'bg-[#efeae2]' : 'bg-[#0b141a]'
      }`}
    >
      {/* WhatsApp Header Bar */}
      <div
        className={`px-4 py-3 border-b flex items-center justify-between z-10 shadow-md transition-colors ${
          isLight
            ? 'bg-[#f0f2f5] border-[#e9edef]'
            : 'bg-[#202c33] border-[#2a3942]'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className={`md:hidden p-1.5 rounded-full transition-colors ${
              isLight
                ? 'text-slate-600 hover:text-black hover:bg-slate-200'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative">
            <div
              className={`w-10 h-10 rounded-full border flex items-center justify-center text-xl shadow-inner ${
                isLight ? 'bg-[#dfe5e7] border-[#d1d7db]' : 'bg-slate-700 border-slate-600'
              }`}
            >
              {contact.avatar}
            </div>
            {contact.status === 'online' && (
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 rounded-full ${
                  isLight ? 'border-[#f0f2f5]' : 'border-[#202c33]'
                }`}
              />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3
                className={`font-bold text-sm sm:text-base leading-tight ${
                  isLight ? 'text-[#111b21]' : 'text-slate-100'
                }`}
              >
                {contact.name}
              </h3>
              {contact.role === 'admin' && (
                <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] px-1.5 py-0.2 rounded font-semibold border border-emerald-500/30">
                  Admin
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium mt-0.5 flex items-center gap-1.5">
              {contact.isTyping ? (
                <span className="text-emerald-600 dark:text-emerald-400 italic animate-pulse font-semibold">typing...</span>
              ) : contact.status === 'online' ? (
                <span className="text-emerald-600 dark:text-emerald-400">online</span>
              ) : (
                <span className={isLight ? 'text-[#667781]' : 'text-slate-400'}>offline</span>
              )}
            </p>
          </div>
        </div>

        {/* WhatsApp Action Icons */}
        <div className={`flex items-center gap-2 ${isLight ? 'text-[#54656f]' : 'text-slate-300'}`}>
          {/* Light / Dark Mode Toggle */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              className={`p-2 rounded-full transition-all flex items-center justify-center ${
                isLight ? 'hover:bg-slate-200 text-amber-600' : 'hover:bg-slate-700/50 text-amber-300'
              }`}
            >
              {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          )}

          {onPanic && (
            <button
              onClick={onPanic}
              title="Stealth / Panic Exit (Esc)"
              className="p-1.5 px-2.5 bg-amber-500/10 hover:bg-amber-500/25 text-amber-500 border border-amber-500/30 rounded-full transition-all flex items-center gap-1 text-xs"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-semibold text-[11px]">Panic</span>
            </button>
          )}
          <button
            title="Start Video Call (Demo)"
            className={`p-2 rounded-full transition-all ${isLight ? 'hover:bg-slate-200' : 'hover:bg-slate-700/50'}`}
          >
            <Video className="w-4 h-4" />
          </button>
          <button
            title="Start Voice Call (Demo)"
            className={`p-2 rounded-full transition-all ${isLight ? 'hover:bg-slate-200' : 'hover:bg-slate-700/50'}`}
          >
            <Phone className="w-4 h-4" />
          </button>
          {onClearChat && (
            <button
              onClick={() => setShowClearConfirm(true)}
              title="Clear Chat for Safety"
              className={`p-2 rounded-full transition-all flex items-center gap-1 text-xs ${
                isLight
                  ? 'hover:bg-rose-50 text-slate-600 hover:text-rose-600'
                  : 'hover:bg-rose-500/20 text-slate-300 hover:text-rose-400'
              }`}
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span className="hidden sm:inline font-medium">Clear Chat</span>
            </button>
          )}
          <div className={`h-4 w-[1px] hidden sm:block ${isLight ? 'bg-slate-300' : 'bg-slate-700'}`} />
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border ${
              isLight
                ? 'bg-white/80 border-[#e9edef] text-[#54656f]'
                : 'bg-slate-800/80 border-slate-700/60 text-slate-300'
            }`}
          >
            <Lock className="w-3 h-3 text-emerald-500" />
            <span>Passcode Encrypted</span>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        className={`flex-1 overflow-y-auto p-4 space-y-3 transition-colors ${
          isLight ? 'bg-[#efeae2]' : 'bg-[#0b141a]'
        }`}
      >
        {/* WhatsApp Security Notice */}
        <div className="text-center my-3">
          <div
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] shadow-sm border ${
              isLight
                ? 'bg-[#ffeecd] border-[#ffdda4] text-[#54656f]'
                : 'bg-[#182229] border-[#222d34] text-[#8696a0]'
            }`}
          >
            <Lock className="w-3 h-3 text-amber-500 shrink-0" />
            <span>Messages are direct & private to <strong>{contact.name}</strong>. No login required.</span>
          </div>
        </div>

        {loading && messages.length === 0 ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div
              className={`w-16 h-16 rounded-full border flex items-center justify-center mx-auto mb-3 text-2xl shadow-md ${
                isLight ? 'bg-white border-[#e9edef]' : 'bg-[#111b21] border-[#222d34]'
              }`}
            >
              💬
            </div>
            <p className={`text-sm font-semibold ${isLight ? 'text-[#111b21]' : 'text-slate-200'}`}>
              Say hello to {contact.name}!
            </p>
            <p className={`text-xs mt-1 ${isLight ? 'text-[#667781]' : 'text-slate-400'}`}>
              Send a message below to start chatting.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            const msgReactions = localReactions[msg.id] || [];
            const isReactionOpen = activeReactionMsgId === msg.id;

            // Group reactions by emoji for display
            const reactionGroups: Record<string, { count: number; myReaction: boolean }> = {};
            msgReactions.forEach(r => {
              if (!reactionGroups[r.emoji]) reactionGroups[r.emoji] = { count: 0, myReaction: false };
              reactionGroups[r.emoji].count++;
              if (r.userId === currentUser.id) reactionGroups[r.emoji].myReaction = true;
            });

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-1 group relative`}
                onMouseEnter={() => setHoveredMsgId(msg.id)}
                onMouseLeave={() => {
                  setHoveredMsgId(null);
                }}
                onClick={() => setHoveredMsgId(msg.id)}
              >
                {/* Message bubble row with hover/tap arrow */}
                <div className={`flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div
                    className={`max-w-[85%] sm:max-w-[65%] rounded-lg p-2.5 sm:p-3 relative ${
                      isMe
                        ? isLight
                          ? 'bg-[#d9fdd3] text-[#111b21] rounded-tr-none shadow-xs border border-emerald-600/10'
                          : 'bg-[#005c4b] text-slate-100 rounded-tr-none shadow-md'
                        : isLight
                        ? 'bg-white text-[#111b21] rounded-tl-none border border-black/5 shadow-xs'
                        : 'bg-[#202c33] text-slate-100 rounded-tl-none border border-[#2a3942] shadow-md'
                    }`}
                  >
                    {/* Image Attachment */}
                    {msg.image && (
                      <div className="mb-2 overflow-hidden rounded-lg bg-black/10 border border-black/10 dark:border-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={msg.image}
                          alt="attachment"
                          onClick={() => setPreviewLightbox(msg.image!)}
                          className="max-h-60 w-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                        />
                      </div>
                    )}

                    {/* Video Attachment */}
                    {msg.video && (
                      <div className="mb-2 overflow-hidden rounded-lg bg-black/20 border border-black/10 dark:border-white/10">
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                        <video
                          src={msg.video}
                          controls
                          className="max-h-60 w-full rounded-lg"
                          style={{ display: 'block' }}
                        />
                      </div>
                    )}

                    {/* Audio / Voice Note Attachment */}
                    {msg.audio && (
                      <div className="mb-2 w-64 max-w-full">
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                        <audio controls src={msg.audio} className="w-full h-9 rounded-lg" />
                      </div>
                    )}

                    {/* WhatsApp-style: text with inline trailing spacer so timestamp never overlaps */}
                    {msg.text && !msg.text.startsWith('ENC:') && (
                      <span className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words">
                        {msg.text}
                        {/* Trailing invisible spacer reserves space for the float-right timestamp */}
                        <span className="inline-block" style={{ width: isMe ? '72px' : '48px' }}>&nbsp;</span>
                      </span>
                    )}

                    {/* Timestamp + ticks + pin/star icons — float-right inside bubble, WhatsApp style */}
                    <span
                      className={`flex items-center gap-1 text-[10px] float-right -mt-4 ml-2 select-none ${
                        isMe
                          ? isLight
                            ? 'text-[#667781]'
                            : 'text-emerald-200/70'
                          : isLight
                          ? 'text-[#667781]'
                          : 'text-[#8696a0]'
                      }`}
                    >
                      {pinnedMsgId === msg.id && <Pin className="w-3 h-3 text-emerald-500" />}
                      {starredMsgIds.has(msg.id) && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                      <span>{formatMessageTime(msg.createdAt)}</span>
                      {isMe && (
                        <span>
                          {msg.read ? (
                            <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                          ) : (
                            <Check className="w-3.5 h-3.5 opacity-80" />
                          )}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Hover / Tap Reaction Arrow Button (accessible on all types of messages) */}
                  <div className="relative shrink-0 self-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isReactionOpen) {
                          setActiveReactionMsgId(null);
                          setShowReactSubmenu(false);
                        } else {
                          const rect = e.currentTarget.getBoundingClientRect();
                          // If closer than 340px to top of screen, open downwards so it doesn't get cut off!
                          setMenuDirection(rect.top < 340 ? 'down' : 'up');
                          setActiveReactionMsgId(msg.id);
                          setShowReactSubmenu(false);
                        }
                      }}
                      style={{ opacity: hoveredMsgId === msg.id || isReactionOpen ? 1 : undefined }}
                      className={`p-1 rounded-full transition-opacity opacity-75 sm:opacity-0 group-hover:opacity-100 ${
                        isLight
                          ? 'bg-white hover:bg-slate-100 text-[#54656f] hover:text-black border border-black/5 shadow-xs'
                          : 'bg-[#2a3942] hover:bg-[#3a4952] text-[#8696a0] hover:text-white'
                      }`}
                      title="Options"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {/* WhatsApp Context Menu with Reaction Bar on top */}
                    {isReactionOpen && (
                      <>
                        {/* Backdrop to close when clicking outside */}
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => {
                            setActiveReactionMsgId(null);
                            setShowReactSubmenu(false);
                          }}
                        />

                        <div
                          className={`absolute z-50 flex flex-col gap-1.5 ${
                            menuDirection === 'down' ? 'top-8' : 'bottom-8'
                          } ${isMe ? 'right-0' : 'left-0'}`}
                          style={{ minWidth: '230px' }}
                        >
                          {/* 1. Emoji Reaction Pill on Top */}
                          <div
                            className={`flex items-center justify-between gap-1 rounded-full px-3 py-1.5 shadow-2xl border ${
                              isLight
                                ? 'bg-white border-[#e9edef]'
                                : 'bg-[#202c33] border-[#2a3942]'
                            }`}
                          >
                            {REACTION_EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                  handleReact(msg.id, emoji);
                                  setActiveReactionMsgId(null);
                                  setShowReactSubmenu(false);
                                }}
                                className="text-xl hover:scale-125 transition-transform active:scale-110 px-0.5"
                                title={emoji}
                              >
                                {emoji}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                setShowReactSubmenu((prev) => !prev);
                              }}
                              className={`p-1 rounded-full transition-colors ml-0.5 ${
                                isLight
                                  ? 'text-[#667781] hover:text-[#111b21] hover:bg-slate-100'
                                  : 'text-[#8696a0] hover:text-white hover:bg-slate-700/50'
                              }`}
                              title="More reaction emojis"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          {/* 2. WhatsApp Dropdown Action Menu */}
                          <div
                            className={`rounded-2xl shadow-2xl py-1.5 overflow-hidden border ${
                              isLight
                                ? 'bg-white border-[#e9edef] text-[#111b21]'
                                : 'bg-[#202c33] border-[#2a3942] text-slate-200'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingTo(msg);
                                setActiveReactionMsgId(null);
                                setShowReactSubmenu(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs transition-colors text-left ${
                                isLight
                                  ? 'hover:bg-[#f5f6f6] text-[#111b21]'
                                  : 'hover:bg-[#111b21] text-slate-200'
                              }`}
                            >
                              <CornerUpLeft className={`w-4 h-4 ${isLight ? 'text-[#667781]' : 'text-[#8696a0]'}`} />
                              <span className="font-medium">Reply</span>
                            </button>

                            {/* React Option with multiple emojis */}
                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowReactSubmenu((prev) => !prev);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-xs transition-colors text-left ${
                                  isLight
                                    ? 'hover:bg-[#f5f6f6] text-[#111b21]'
                                    : 'hover:bg-[#111b21] text-slate-200'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <Smile className={`w-4 h-4 ${isLight ? 'text-[#667781]' : 'text-[#8696a0]'}`} />
                                  <span className="font-medium">React</span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {showReactSubmenu ? '▲ Close' : '▶ Choose emoji'}
                                </span>
                              </button>

                              {/* Multi-Emoji Reaction Picker Tray */}
                              {showReactSubmenu && (
                                <div
                                  className={`p-2 border-t border-b grid grid-cols-6 gap-1 animate-fadeIn ${
                                    isLight ? 'bg-slate-100 border-[#e9edef]' : 'bg-[#182229] border-[#2a3942]'
                                  }`}
                                >
                                  {ALL_REACTION_EMOJIS.map((emoji) => (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={() => {
                                        handleReact(msg.id, emoji);
                                        setActiveReactionMsgId(null);
                                        setShowReactSubmenu(false);
                                      }}
                                      className="text-xl p-1.5 rounded-lg hover:scale-130 active:scale-110 transition-transform flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10"
                                      title={emoji}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setPinnedMsgId((prev) => (prev === msg.id ? null : msg.id));
                                setActiveReactionMsgId(null);
                                setShowReactSubmenu(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs transition-colors text-left ${
                                isLight
                                  ? 'hover:bg-[#f5f6f6] text-[#111b21]'
                                  : 'hover:bg-[#111b21] text-slate-200'
                              }`}
                            >
                              <Pin className={`w-4 h-4 ${pinnedMsgId === msg.id ? 'text-emerald-500' : isLight ? 'text-[#667781]' : 'text-[#8696a0]'}`} />
                              <span className="font-medium">{pinnedMsgId === msg.id ? 'Unpin' : 'Pin'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setStarredMsgIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(msg.id)) next.delete(msg.id);
                                  else next.add(msg.id);
                                  return next;
                                });
                                setActiveReactionMsgId(null);
                                setShowReactSubmenu(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs transition-colors text-left ${
                                isLight
                                  ? 'hover:bg-[#f5f6f6] text-[#111b21]'
                                  : 'hover:bg-[#111b21] text-slate-200'
                              }`}
                            >
                              <Star
                                className={`w-4 h-4 ${
                                  starredMsgIds.has(msg.id)
                                    ? 'text-amber-500 fill-amber-500'
                                    : isLight ? 'text-[#667781]' : 'text-[#8696a0]'
                                }`}
                              />
                              <span className="font-medium">{starredMsgIds.has(msg.id) ? 'Unstar' : 'Star'}</span>
                            </button>

                            <div className={`my-1 border-t ${isLight ? 'border-[#e9edef]' : 'border-[#2a3942]'}`} />

                            {onDeleteMessage && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveReactionMsgId(null);
                                  setShowReactSubmenu(false);
                                  setDeleteModalMsg(msg);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs transition-colors text-left ${
                                  isLight
                                    ? 'hover:bg-rose-50 text-[#111b21] hover:text-rose-600'
                                    : 'hover:bg-rose-950/40 text-slate-200 hover:text-rose-400'
                                }`}
                              >
                                <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-rose-500" />
                                <span className="font-medium">Delete</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Reactions Row below bubble (Only visible reacted emoji) */}
                {msgReactions.length > 0 && (
                  <div className={`flex flex-wrap gap-1 mt-1 select-none ${isMe ? 'justify-end pr-2' : 'justify-start pl-2'}`}>
                    {msgReactions.map((r, idx) => {
                      const reactorName = r.userId === currentUser.id ? currentUser.name : contact.name;
                      const isMyReaction = r.userId === currentUser.id;

                      return (
                        <button
                          key={`${r.userId}_${r.emoji}_${idx}`}
                          type="button"
                          onClick={() => handleReact(msg.id, r.emoji)}
                          title={`${reactorName}: ${r.emoji} (Click to ${isMyReaction ? 'remove' : 'toggle'})`}
                          className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs border shadow-xs transition-all hover:scale-110 active:scale-95 cursor-pointer ${
                            isMyReaction
                              ? isLight
                                ? 'bg-[#d9fdd3] border-emerald-500/60 text-emerald-900'
                                : 'bg-[#005c4b]/80 border-emerald-500/60 text-emerald-200'
                              : isLight
                              ? 'bg-white border-[#e9edef] text-slate-700'
                              : 'bg-[#202c33] border-[#2a3942] text-slate-200'
                          }`}
                        >
                          <span className="text-sm leading-none">{r.emoji}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Replying to Preview Bar */}
      {replyingTo && (
        <div
          className={`p-2.5 px-4 border-t flex items-center justify-between gap-3 text-xs ${
            isLight
              ? 'bg-[#f0f2f5] border-[#e9edef]'
              : 'bg-[#182229] border-[#2a3942]'
          }`}
        >
          <div className="border-l-3 border-[#00a884] pl-3 overflow-hidden">
            <span className="font-semibold text-[#00a884] text-[11px] block">
              {replyingTo.senderId === currentUser.id ? 'You' : contact.name}
            </span>
            <span className={`truncate block text-[11px] mt-0.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              {(replyingTo.text && !replyingTo.text.startsWith('ENC:') ? replyingTo.text : null) || (replyingTo.image ? '📷 Photo' : replyingTo.video ? '📹 Video' : replyingTo.audio ? '🎙️ Voice note' : 'Message')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className={`p-1.5 rounded-lg transition-colors ${
              isLight
                ? 'text-slate-500 hover:text-black hover:bg-slate-200'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
            title="Cancel reply"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Selected Image Preview Bar */}
      {selectedImage && (
        <div
          className={`p-3 border-t flex items-center justify-between gap-3 ${
            isLight
              ? 'bg-[#f0f2f5] border-[#e9edef]'
              : 'bg-[#202c33] border-[#2a3942]'
          }`}
        >
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedImage} alt="preview" className="w-12 h-12 rounded-lg object-cover border border-slate-400/40" />
            <span className={`text-xs font-medium ${isLight ? 'text-[#111b21]' : 'text-slate-200'}`}>Image attached</span>
          </div>
          <button
            onClick={() => setSelectedImage(null)}
            className={`p-1.5 rounded-lg transition-colors ${
              isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Selected Video Preview Bar */}
      {selectedVideo && (
        <div
          className={`p-3 border-t flex items-center justify-between gap-3 ${
            isLight
              ? 'bg-[#f0f2f5] border-[#e9edef]'
              : 'bg-[#202c33] border-[#2a3942]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-lg border flex items-center justify-center shrink-0 ${
                isLight ? 'bg-white border-[#e9edef]' : 'bg-[#111b21] border-slate-600'
              }`}
            >
              <VideoIcon className="w-5 h-5 text-emerald-500" />
            </div>
            <span className={`text-xs font-medium ${isLight ? 'text-[#111b21]' : 'text-slate-200'}`}>Video attached</span>
          </div>
          <button
            onClick={() => setSelectedVideo(null)}
            className={`p-1.5 rounded-lg transition-colors ${
              isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Emoji Bar */}
      {showEmojiPicker && (
        <div
          className={`px-4 py-2 border-t flex items-center gap-2 overflow-x-auto ${
            isLight
              ? 'bg-[#f0f2f5] border-[#e9edef]'
              : 'bg-[#111b21] border-[#222d34]'
          }`}
        >
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setText((prev) => prev + emoji)}
              className={`text-xl p-1.5 rounded-lg transition-all ${
                isLight ? 'hover:bg-[#e9edef]' : 'hover:bg-[#202c33]'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* WhatsApp Input Bar */}
      {isRecording ? (
        <div
          className={`p-3 border-t flex items-center justify-between gap-3 ${
            isLight
              ? 'bg-[#f0f2f5] border-[#e9edef]'
              : 'bg-[#202c33] border-[#2a3942]'
          }`}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={cancelRecording}
              title="Cancel recording"
              className="p-2.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 transition-all shrink-0"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
              <span className={`text-sm font-mono font-semibold ${isLight ? 'text-[#111b21]' : 'text-slate-100'}`}>
                {formatSeconds(recordingSeconds)}
              </span>
              <span className={`text-xs hidden sm:inline ${isLight ? 'text-[#667781]' : 'text-slate-400'}`}>
                Recording voice note...
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={stopAndSendRecording}
            title="Send Voice Note"
            className="p-3 bg-[#00a884] hover:bg-[#008f70] text-white rounded-full shadow-md transition-all shrink-0 flex items-center justify-center active:scale-95"
          >
            <Send className="w-4 h-4 fill-current" />
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSend}
          className={`p-3 border-t flex items-end gap-2 transition-colors ${
            isLight
              ? 'bg-[#f0f2f5] border-[#e9edef]'
              : 'bg-[#202c33] border-[#2a3942]'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <input
            type="file"
            ref={videoInputRef}
            accept="video/*"
            onChange={handleVideoSelect}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach Image"
            className={`p-2.5 rounded-full transition-all shrink-0 ${
              isLight
                ? 'text-[#54656f] hover:text-[#111b21] hover:bg-slate-200'
                : 'text-[#8696a0] hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            title="Attach Video"
            className={`p-2.5 rounded-full transition-all shrink-0 ${
              isLight
                ? 'text-[#54656f] hover:text-[#111b21] hover:bg-slate-200'
                : 'text-[#8696a0] hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <VideoIcon className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Emoji Picker"
            className={`p-2.5 rounded-full transition-all shrink-0 ${
              isLight
                ? 'text-[#54656f] hover:text-[#111b21] hover:bg-slate-200'
                : 'text-[#8696a0] hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <Smile className="w-5 h-5" />
          </button>

          <div
            className={`flex-1 border rounded-lg px-3 py-2 flex items-center transition-colors ${
              isLight
                ? 'bg-white border-[#e9edef]'
                : 'bg-[#2a3942] border-[#2a3942]'
            }`}
          >
            <textarea
              rows={1}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${contact.name}...`}
              className={`w-full bg-transparent text-xs sm:text-sm focus:outline-none resize-none max-h-24 leading-normal ${
                isLight
                  ? 'text-[#111b21] placeholder:text-[#667781]'
                  : 'text-slate-100 placeholder:text-[#8696a0]'
              }`}
            />
          </div>

          {text.trim() || selectedImage || selectedVideo ? (
            <button
              type="submit"
              disabled={sending}
              className="p-3 bg-[#00a884] hover:bg-[#008f70] disabled:opacity-40 text-white rounded-full shadow-md transition-all shrink-0 flex items-center justify-center active:scale-95"
              title="Send message"
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4 fill-current" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="p-3 bg-[#00a884] hover:bg-[#008f70] text-white rounded-full shadow-md transition-all shrink-0 flex items-center justify-center active:scale-95"
              title="Record voice note"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </form>
      )}

      {/* Lightbox Overlay */}
      {previewLightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <button
            onClick={() => setPreviewLightbox(null)}
            className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full text-white"
          >
            <X className="w-6 h-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewLightbox} alt="enlarged" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}

      {/* Clear Chat Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div
            className={`w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl border ${
              isLight
                ? 'bg-white border-[#e9edef] text-[#111b21]'
                : 'bg-[#111b21] border-[#222d34] text-slate-100'
            }`}
          >
            <div className="w-12 h-12 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-3 text-rose-500 border border-rose-500/30">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className={`text-lg font-bold mb-2 ${isLight ? 'text-[#111b21]' : 'text-slate-100'}`}>
              Clear Chat History?
            </h3>
            <p className={`text-xs mb-6 leading-relaxed ${isLight ? 'text-[#667781]' : 'text-slate-400'}`}>
              Are you sure you want to clear all messages with <strong>{contact.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={clearing}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (onClearChat) {
                    setClearing(true);
                    try {
                      await onClearChat();
                    } finally {
                      setClearing(false);
                      setShowClearConfirm(false);
                    }
                  }
                }}
                disabled={clearing}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5"
              >
                {clearing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Clear Chat'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Delete Message Modal (Delete for everyone / Delete for me) */}
      {deleteModalMsg && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div
            className={`w-full max-w-xs rounded-2xl p-5 shadow-2xl text-center border ${
              isLight
                ? 'bg-white border-[#e9edef] text-[#111b21]'
                : 'bg-[#202c33] border-[#2a3942] text-slate-100'
            }`}
          >
            <div className="w-11 h-11 bg-rose-500/15 rounded-full flex items-center justify-center mx-auto mb-3 text-rose-500 border border-rose-500/30">
              <Trash2 className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold mb-1">Delete message?</h4>
            <p className={`text-xs mb-5 leading-relaxed ${isLight ? 'text-[#667781]' : 'text-slate-400'}`}>
              {deleteModalMsg.senderId === currentUser.id 
                ? 'You can delete this message for everyone or only for yourself.' 
                : 'Delete this message from your device?'}
            </p>

            <div className="flex flex-col gap-2">
              {/* Delete for everyone (available for messages sent by the user) */}
              {deleteModalMsg.senderId === currentUser.id && onDeleteMessage && (
                <button
                  type="button"
                  onClick={() => {
                    const id = deleteModalMsg.id;
                    setDeleteModalMsg(null);
                    onDeleteMessage(id, 'everyone');
                  }}
                  className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all active:scale-98"
                >
                  Delete for everyone
                </button>
              )}

              {/* Delete for me (always available) */}
              {onDeleteMessage && (
                <button
                  type="button"
                  onClick={() => {
                    const id = deleteModalMsg.id;
                    setDeleteModalMsg(null);
                    onDeleteMessage(id, 'me');
                  }}
                  className={`w-full py-2.5 px-4 text-xs font-semibold rounded-xl border transition-all active:scale-98 ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-[#111b21] border-[#e9edef]'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700/60'
                  }`}
                >
                  Delete for me
                </button>
              )}

              <button
                type="button"
                onClick={() => setDeleteModalMsg(null)}
                className={`w-full py-2 px-4 text-xs font-medium rounded-xl transition-all mt-1 ${
                  isLight
                    ? 'text-[#667781] hover:text-[#111b21]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
