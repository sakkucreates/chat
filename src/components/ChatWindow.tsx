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
  Lock,
  Phone,
  Video,
  MoreVertical
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

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '🎉', '👋', '🙏', '✨', '😊', '😍', '🙌', '💯'];

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
    <div className="flex-1 flex flex-col h-full bg-[#0b141a] relative overflow-hidden">
      {/* WhatsApp Header Bar */}
      <div className="px-4 py-3 bg-[#202c33] border-b border-[#2a3942] flex items-center justify-between z-10 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="md:hidden p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-700/50"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xl shadow-inner">
              {contact.avatar}
            </div>
            {contact.status === 'online' && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#202c33] rounded-full" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-100 text-sm sm:text-base leading-tight">{contact.name}</h3>
              {contact.role === 'admin' && (
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.2 rounded font-semibold border border-emerald-500/30">
                  Admin
                </span>
              )}
            </div>
            <p className="text-[11px] text-emerald-400 font-medium mt-0.5 flex items-center gap-1.5">
              {contact.status === 'online' ? (
                <span>online</span>
              ) : (
                <span className="text-slate-400">offline • Code: {contact.code}</span>
              )}
            </p>
          </div>
        </div>

        {/* WhatsApp Action Icons */}
        <div className="flex items-center gap-3 text-slate-300">
          <button title="Start Video Call (Demo)" className="p-2 hover:bg-slate-700/50 rounded-full transition-all">
            <Video className="w-4 h-4" />
          </button>
          <button title="Start Voice Call (Demo)" className="p-2 hover:bg-slate-700/50 rounded-full transition-all">
            <Phone className="w-4 h-4" />
          </button>
          <div className="h-4 w-[1px] bg-slate-700 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 border border-slate-700/60 rounded-full text-slate-300 text-[11px]">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Passcode Encrypted</span>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a]">
        {/* WhatsApp Security Notice */}
        <div className="text-center my-3">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#182229] border border-[#222d34] rounded-lg text-[11px] text-[#8696a0] shadow-sm">
            <Lock className="w-3 h-3 text-amber-400 shrink-0" />
            <span>Messages are direct & private to <strong>{contact.name}</strong>. No login required.</span>
          </div>
        </div>

        {loading && messages.length === 0 ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-[#111b21] rounded-full border border-[#222d34] flex items-center justify-center mx-auto mb-3 text-2xl shadow-md">
              💬
            </div>
            <p className="text-sm font-semibold text-slate-200">Say hello to {contact.name}!</p>
            <p className="text-xs text-slate-400 mt-1">Send a message below to start chatting.</p>
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
                  className={`max-w-[85%] sm:max-w-[65%] rounded-lg p-2.5 sm:p-3 shadow-md relative ${
                    isMe
                      ? 'bg-[#005c4b] text-slate-100 rounded-tr-none'
                      : 'bg-[#202c33] text-slate-100 rounded-tl-none border border-[#2a3942]'
                  }`}
                >
                  {/* Image Attachment */}
                  {msg.image && (
                    <div className="mb-2 overflow-hidden rounded-lg bg-black/20 border border-white/10">
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
                    <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words pr-12">
                      {msg.text}
                    </p>
                  )}

                  {/* WhatsApp Timestamp & Read Ticks */}
                  <div
                    className={`flex items-center justify-end gap-1 text-[10px] mt-1 float-right ml-2 ${
                      isMe ? 'text-emerald-200/90' : 'text-[#8696a0]'
                    }`}
                  >
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
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Selected Image Preview Bar */}
      {selectedImage && (
        <div className="p-3 bg-[#202c33] border-t border-[#2a3942] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedImage} alt="preview" className="w-12 h-12 rounded-lg object-cover border border-slate-600" />
            <span className="text-xs text-slate-200 font-medium">Image attached</span>
          </div>
          <button
            onClick={() => setSelectedImage(null)}
            className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Emoji Bar */}
      {showEmojiPicker && (
        <div className="px-4 py-2 bg-[#111b21] border-t border-[#222d34] flex items-center gap-2 overflow-x-auto">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setText((prev) => prev + emoji)}
              className="text-xl p-1.5 hover:bg-[#202c33] rounded-lg transition-all"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* WhatsApp Input Bar */}
      <form onSubmit={handleSend} className="p-3 bg-[#202c33] border-t border-[#2a3942] flex items-end gap-2">
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
          title="Attach File / Image"
          className="p-2.5 rounded-full hover:bg-slate-700/50 text-[#8696a0] hover:text-slate-200 transition-all shrink-0"
        >
          <ImageIcon className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          title="Emoji Picker"
          className="p-2.5 rounded-full hover:bg-slate-700/50 text-[#8696a0] hover:text-slate-200 transition-all shrink-0"
        >
          <Smile className="w-5 h-5" />
        </button>

        <div className="flex-1 bg-[#2a3942] border border-[#2a3942] rounded-lg px-3 py-2 flex items-center">
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${contact.name}...`}
            className="w-full bg-transparent text-xs sm:text-sm text-slate-100 placeholder:text-[#8696a0] focus:outline-none resize-none max-h-24 leading-normal"
          />
        </div>

        <button
          type="submit"
          disabled={(!text.trim() && !selectedImage) || sending}
          className="p-3 bg-[#00a884] hover:bg-[#008f70] disabled:opacity-40 text-white rounded-full shadow-md transition-all shrink-0 flex items-center justify-center active:scale-95"
        >
          {sending ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4 fill-current" />
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
          <img src={previewLightbox} alt="enlarged" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}
