'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Image as ImageIcon, 
  ArrowLeft, 
  CheckCheck, 
  Check, 
  Smile, 
  X, 
  Sparkles,
  Lock
} from 'lucide-react';
import { User, Message } from '@/lib/db';

interface ChatWindowProps {
  currentUser: User;
  contact: User;
  messages: Message[];
  onSendMessage: (text: string, image?: string) => Promise<void>;
  onBack: () => void;
  loading: boolean;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '🎉', '👋', '🙏', '✨'];

export default function ChatWindow({
  currentUser,
  contact,
  messages,
  onSendMessage,
  onBack,
  loading
}: ChatWindowProps) {
  const [text, setText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [previewLightbox, setPreviewLightbox] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!text.trim() && !selectedImage) || sending) return;

    setSending(true);
    const msgText = text;
    const msgImg = selectedImage;

    setText('');
    setSelectedImage(null);
    setShowEmojiPicker(false);

    try {
      await onSendMessage(msgText, msgImg || undefined);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
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

  const formatMessageTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 relative overflow-hidden">
      {/* Top Header Bar */}
      <div className="p-3 sm:p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="md:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl">
              {contact.avatar}
            </div>
            {contact.status === 'online' ? (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
            ) : (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-slate-500 border-2 border-slate-900 rounded-full" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm sm:text-base leading-tight">{contact.name}</h3>
              {contact.role === 'admin' && (
                <span className="bg-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0.2 rounded font-medium border border-amber-500/30">
                  Admin
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
              {contact.status === 'online' ? (
                <span className="text-emerald-400 font-medium">Online now</span>
              ) : (
                <span>Offline</span>
              )}
              <span className="text-slate-600">•</span>
              <span className="font-mono text-slate-400">Passcode: {contact.code}</span>
            </p>
          </div>
        </div>

        {/* Security / End-to-end indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 border border-slate-700/60 rounded-full text-slate-400 text-[11px]">
          <Lock className="w-3 h-3 text-emerald-400" />
          <span>Direct Passcode Session</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome Notice */}
        <div className="text-center my-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-full text-[11px] text-slate-400 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Chatting with <strong>{contact.name}</strong>. No login required.</span>
          </div>
        </div>

        {loading && messages.length === 0 ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-14 h-14 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-center mx-auto mb-3 text-2xl">
              💬
            </div>
            <p className="text-sm font-semibold text-slate-300">No messages yet</p>
            <p className="text-xs text-slate-500 mt-1">Send a message to start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 sm:p-3.5 shadow-md ${
                    isMe
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none'
                      : 'bg-slate-950 border border-slate-800 text-slate-100 rounded-bl-none'
                  }`}
                >
                  {/* Image Attachment */}
                  {msg.image && (
                    <div className="mb-2 overflow-hidden rounded-xl bg-black/20 border border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={msg.image}
                        alt="attachment"
                        onClick={() => setPreviewLightbox(msg.image!)}
                        className="max-h-60 w-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                      />
                    </div>
                  )}

                  {/* Message Text */}
                  {msg.text && (
                    <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words">
                      {msg.text}
                    </p>
                  )}

                  {/* Timestamp & Read Receipts */}
                  <div
                    className={`flex items-center justify-end gap-1 text-[10px] mt-1.5 ${
                      isMe ? 'text-indigo-200' : 'text-slate-500'
                    }`}
                  >
                    <span>{formatMessageTime(msg.createdAt)}</span>
                    {isMe && (
                      <span>
                        {msg.read ? (
                          <CheckCheck className="w-3.5 h-3.5 text-sky-300" />
                        ) : (
                          <Check className="w-3.5 h-3.5 opacity-80" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Selected Image Preview Modal Bar */}
      {selectedImage && (
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedImage} alt="preview" className="w-12 h-12 rounded-xl object-cover border border-slate-700" />
            <span className="text-xs text-slate-300 font-medium">Image attached</span>
          </div>
          <button
            onClick={() => setSelectedImage(null)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Emoji Bar Toggle */}
      {showEmojiPicker && (
        <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center gap-2 overflow-x-auto">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setText((prev) => prev + emoji)}
              className="text-lg p-1.5 hover:bg-slate-800 rounded-xl transition-all"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Bottom Input Controls Bar */}
      <form onSubmit={handleSend} className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 flex items-end gap-2">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Attach Image"
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all shrink-0"
        >
          <ImageIcon className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          title="Emoji Picker"
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all shrink-0"
        >
          <Smile className="w-5 h-5" />
        </button>

        <div className="flex-1 bg-slate-800/80 border border-slate-700/80 rounded-2xl px-3 py-2 flex items-center">
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${contact.name}...`}
            className="w-full bg-transparent text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none resize-none max-h-24 leading-normal"
          />
        </div>

        <button
          type="submit"
          disabled={(!text.trim() && !selectedImage) || sending}
          className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-40 text-white rounded-2xl shadow-lg shadow-indigo-500/20 transition-all shrink-0 flex items-center justify-center active:scale-95"
        >
          {sending ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>

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
          <img src={previewLightbox} alt="enlarged" className="max-w-full max-h-full rounded-2xl object-contain" />
        </div>
      )}
    </div>
  );
}
