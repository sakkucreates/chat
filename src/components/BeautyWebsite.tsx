'use client';

import React, { useState } from 'react';
import { Lock } from 'lucide-react';

interface BeautyWebsiteProps {
  onReset?: () => void;
}

export default function BeautyWebsite({ onReset }: BeautyWebsiteProps) {
  const [loading, setLoading] = useState(true);

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#000] overflow-hidden z-50">
      {/* Loading indicator while iframe loads */}
      {loading && (
        <div className="absolute inset-0 bg-[#FDFBF7] flex flex-col items-center justify-center text-slate-800 z-10">
          <div className="w-10 h-10 border-3 border-[#C89B8C]/30 border-t-[#C89B8C] rounded-full animate-spin mb-4" />
          <p className="text-xs font-serif text-[#6E5D5A] tracking-widest uppercase">Loading Beauty N Joy...</p>
        </div>
      )}

      {/* Embedded Beauty N Joy Website */}
      <iframe
        src="https://beauty-n-joy-demo.pixelworks.workers.dev/"
        title="Beauty N Joy | Salon & Beauty Experience"
        className="w-full h-full border-0"
        onLoad={() => setLoading(false)}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />

      {/* Discreet Lock Button Overlay (Bottom Right) */}
      {onReset && (
        <button
          onClick={onReset}
          title="Return to Access Gate"
          className="fixed bottom-3 right-3 p-2 bg-black/40 hover:bg-black/80 text-white/50 hover:text-white rounded-full backdrop-blur-md z-50 transition-all opacity-40 hover:opacity-100 shadow-lg border border-white/10 group"
        >
          <Lock className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </button>
      )}
    </div>
  );
}
