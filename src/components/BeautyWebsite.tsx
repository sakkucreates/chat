'use client';

import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Heart, 
  Star, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  Menu, 
  X,
  Lock
} from 'lucide-react';

interface BeautyWebsiteProps {
  onReset?: () => void;
}

const PRODUCTS = [
  {
    id: 1,
    name: 'Nude Velvet Cashmere Lipstick',
    category: 'Lip Care & Color',
    price: '$42.00',
    rating: 4.9,
    reviews: 128,
    badge: 'Best Seller',
    bgGradient: 'from-[#F7ECE6] to-[#E8D4CB]',
    imageEmoji: '💄',
    desc: 'Weightless matte formula infused with wild rose oil and shea butter.'
  },
  {
    id: 2,
    name: 'Lumière Rose Botanical Serum',
    category: 'Skincare Elixir',
    price: '$88.00',
    rating: 5.0,
    reviews: 245,
    badge: 'Award Winner',
    bgGradient: 'from-[#FDF3EE] to-[#E5D2C9]',
    imageEmoji: '✨',
    desc: 'Deeply hydrating hyaluronic & peptide blend for a glass-skin radiant finish.'
  },
  {
    id: 3,
    name: 'Crème de Soie Sculpting Moisturizer',
    category: 'Barrier Hydration',
    price: '$96.00',
    rating: 4.8,
    reviews: 94,
    badge: 'New',
    bgGradient: 'from-[#F4E9E2] to-[#DFC8BD]',
    imageEmoji: '🧴',
    desc: 'Rich whip moisturizer with squalane and damask rose extract.'
  },
  {
    id: 4,
    name: 'Silk Petal Nude Lip Gloss',
    category: 'Plumping Gloss',
    price: '$34.00',
    rating: 4.9,
    reviews: 182,
    badge: 'Trending',
    bgGradient: 'from-[#FBF0EA] to-[#EACFCE]',
    imageEmoji: '👄',
    desc: 'Non-sticky glass shine infused with jojoba and vitamin E.'
  }
];

export default function BeautyWebsite({ onReset }: BeautyWebsiteProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [addedItems, setAddedItems] = useState<number[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');

  const toggleCart = (id: number) => {
    if (addedItems.includes(id)) {
      setAddedItems(addedItems.filter((itemId) => itemId !== id));
    } else {
      setAddedItems([...addedItems, id]);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2D2424] font-sans selection:bg-[#E8D4CB] selection:text-[#2D2424] overflow-x-hidden">
      {/* Top Announcement Bar */}
      <div className="bg-[#4A3E3D] text-[#F5EBE6] text-[11px] sm:text-xs py-2 px-4 text-center font-medium tracking-wide flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-[#D4B2A7] animate-pulse" />
        <span>Complimentary Luxury Silk Gift Box & Express Shipping on orders over $75</span>
        <Sparkles className="w-3.5 h-3.5 text-[#D4B2A7] animate-pulse" />
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-[#EFE3DC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#4A3E3D] hover:bg-[#F5EBE6] rounded-lg transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Logo / Brand Name */}
          <div className="flex flex-col items-center md:items-start cursor-pointer">
            <span className="font-serif text-2xl sm:text-3xl tracking-[0.25em] text-[#2D2424] uppercase font-light">
              AURA
            </span>
            <span className="text-[9px] tracking-[0.3em] text-[#A88B83] uppercase -mt-1">
              Maison de Beauté
            </span>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-medium tracking-widest text-[#4A3E3D] uppercase">
            <button
              onClick={() => setActiveCategory('All')}
              className={`hover:text-[#C89B8C] transition-colors py-1 ${activeCategory === 'All' ? 'border-b border-[#C89B8C] text-[#C89B8C]' : ''}`}
            >
              Collection
            </button>
            <button
              onClick={() => setActiveCategory('Skincare')}
              className={`hover:text-[#C89B8C] transition-colors py-1 ${activeCategory === 'Skincare' ? 'border-b border-[#C89B8C] text-[#C89B8C]' : ''}`}
            >
              Skincare
            </button>
            <button
              onClick={() => setActiveCategory('Lips')}
              className={`hover:text-[#C89B8C] transition-colors py-1 ${activeCategory === 'Lips' ? 'border-b border-[#C89B8C] text-[#C89B8C]' : ''}`}
            >
              Nude Lips
            </button>
            <button
              onClick={() => setActiveCategory('Sets')}
              className={`hover:text-[#C89B8C] transition-colors py-1 ${activeCategory === 'Sets' ? 'border-b border-[#C89B8C] text-[#C89B8C]' : ''}`}
            >
              Gift Sets
            </button>
          </nav>

          {/* Action Icons */}
          <div className="flex items-center gap-4 text-[#4A3E3D]">
            <button title="Search" className="p-2 hover:bg-[#F5EBE6] rounded-full transition-all">
              <Search className="w-4 h-4" />
            </button>
            <button title="Wishlist" className="p-2 hover:bg-[#F5EBE6] rounded-full transition-all">
              <Heart className="w-4 h-4" />
            </button>
            <div className="relative">
              <button title="Shopping Bag" className="p-2 bg-[#F5EBE6] hover:bg-[#E8D8CF] text-[#2D2424] rounded-full transition-all flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </button>
              {addedItems.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#C89B8C] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {addedItems.length}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#FDFBF7] border-b border-[#EFE3DC] px-6 py-4 space-y-3">
            <a href="#" className="block text-xs uppercase tracking-widest text-[#4A3E3D] py-2 font-medium">The Nude Collection</a>
            <a href="#" className="block text-xs uppercase tracking-widest text-[#4A3E3D] py-2 font-medium">Skincare Elixirs</a>
            <a href="#" className="block text-xs uppercase tracking-widest text-[#4A3E3D] py-2 font-medium">Lip Rituals</a>
            <a href="#" className="block text-xs uppercase tracking-widest text-[#4A3E3D] py-2 font-medium">Bestsellers</a>
          </div>
        )}
      </header>

      {/* Hero Banner Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#FDFBF7] via-[#F7F0EB] to-[#EFE5DF] py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E8D8CF]/60 border border-[#D4B2A7]/40 rounded-full text-[11px] text-[#6E5D5A] font-medium uppercase tracking-widest">
              <Sparkles className="w-3 h-3 text-[#C89B8C]" />
              <span>New Arrival • The Cashmere Edition</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-light text-[#2D2424] leading-[1.15] tracking-tight">
              Illuminate Your Natural Beauty.
            </h1>

            <p className="text-sm sm:text-base text-[#6E5D5A] leading-relaxed max-w-xl mx-auto lg:mx-0 font-light">
              Discover our signature nude collection formulated with pure botanical extracts, wild rosehip oils, and crushed pearl pigments for effortless daily radiance.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button className="w-full sm:w-auto px-8 py-3.5 bg-[#4A3E3D] hover:bg-[#2D2424] text-[#FDFBF7] text-xs font-medium uppercase tracking-widest rounded-full shadow-lg shadow-[#4A3E3D]/10 transition-all flex items-center justify-center gap-2 group">
                <span>Shop the Collection</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-[#F5EBE6] text-[#4A3E3D] border border-[#EFE3DC] text-xs font-medium uppercase tracking-widest rounded-full transition-all">
                Discover Ingredients
              </button>
            </div>

            {/* Trust Badges */}
            <div className="pt-8 border-t border-[#EFE3DC]/60 flex items-center justify-center lg:justify-start gap-6 text-[11px] text-[#A88B83]">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#C89B8C]" />
                <span>Dermatologist Tested</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <span>100% Cruelty-Free</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <span>Vegan Botanicals</span>
              </div>
            </div>
          </div>

          {/* Hero Visual Card */}
          <div className="relative flex justify-center">
            <div className="w-full max-w-md bg-gradient-to-tr from-[#F7ECE6] via-[#E8D4CB] to-[#FDF3EE] rounded-3xl p-8 shadow-2xl border border-white/60 relative overflow-hidden group">
              <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-semibold text-[#4A3E3D] uppercase tracking-wider">
                Limited Edition
              </div>

              <div className="h-64 sm:h-72 flex items-center justify-center text-7xl sm:text-8xl drop-shadow-xl group-hover:scale-105 transition-transform duration-500">
                💄 ✨ 🧴
              </div>

              <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 shadow-lg border border-[#EFE3DC]">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-serif text-lg font-medium text-[#2D2424]">The Nude Radiance Set</h3>
                  <span className="text-sm font-semibold text-[#4A3E3D]">$148.00</span>
                </div>
                <p className="text-xs text-[#6E5D5A] font-light mb-3">
                  Includes Velvet Lipstick, Rose Serum & Silk Sculpting Moisture Cream.
                </p>
                <button className="w-full py-2.5 bg-[#C89B8C] hover:bg-[#B68777] text-white text-xs font-semibold rounded-xl uppercase tracking-wider shadow-md transition-all">
                  Quick Add to Bag
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-medium text-[#C89B8C] uppercase tracking-[0.25em]">Curated Essentials</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-light text-[#2D2424] mt-2">Signature Best Sellers</h2>
          <p className="text-xs sm:text-sm text-[#6E5D5A] mt-2 font-light">
            Formulated to enhance your unique tone with lightweight, buildable pigment and deeply nourishing botanical oils.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PRODUCTS.map((product) => {
            const isAdded = addedItems.includes(product.id);

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl p-5 border border-[#EFE3DC] hover:border-[#D4B2A7] hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Product Display Box */}
                  <div className={`w-full h-48 rounded-xl bg-gradient-to-tr ${product.bgGradient} flex items-center justify-center text-5xl mb-4 relative overflow-hidden group-hover:scale-[1.02] transition-transform`}>
                    <span className="drop-shadow-md">{product.imageEmoji}</span>
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[#4A3E3D] text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {product.badge}
                    </span>
                  </div>

                  {/* Category & Rating */}
                  <div className="flex items-center justify-between text-[11px] text-[#A88B83] mb-1">
                    <span>{product.category}</span>
                    <div className="flex items-center gap-1 text-amber-500 font-medium">
                      <Star className="w-3 h-3 fill-current" />
                      <span>{product.rating}</span>
                      <span className="text-[#A88B83]">({product.reviews})</span>
                    </div>
                  </div>

                  {/* Title & Price */}
                  <h3 className="font-serif text-base font-medium text-[#2D2424] leading-snug group-hover:text-[#C89B8C] transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-xs text-[#6E5D5A] mt-1 line-clamp-2 font-light">{product.desc}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#F5EBE6] flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#2D2424]">{product.price}</span>
                  <button
                    onClick={() => toggleCart(product.id)}
                    className={`px-4 py-2 text-xs font-medium rounded-xl uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                      isAdded
                        ? 'bg-emerald-700 text-white'
                        : 'bg-[#F5EBE6] hover:bg-[#E8D8CF] text-[#4A3E3D]'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Added</span>
                      </>
                    ) : (
                      <span>Add to Bag</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Philosophy Banner */}
      <section className="bg-[#F5EBE6] border-y border-[#EFE3DC] py-16">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-4">
          <span className="text-xs font-medium text-[#A88B83] uppercase tracking-[0.3em]">Pure • Conscious • Radiant</span>
          <h2 className="font-serif text-2xl sm:text-4xl font-light text-[#2D2424]">
            "Beauty in its purest form — crafted with skin-loving silk & floral botanicals."
          </h2>
          <p className="text-xs sm:text-sm text-[#6E5D5A] max-w-xl mx-auto font-light">
            Every bottle is hand-poured in micro-batches to preserve the highest potency of our cold-pressed botanical oils.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#2D2424] text-[#F5EBE6] py-12 border-t border-[#4A3E3D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <span className="font-serif text-xl tracking-[0.2em] uppercase font-light text-white">AURA</span>
            <p className="text-[11px] text-[#A88B83] mt-1 font-light">
              © {new Date().getFullYear()} MAISON AURA BEAUTÉ. All rights reserved.
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs text-[#D4B2A7] font-light">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Shipping & Returns</a>

            {/* Subtle Reset Button for Return to Master Passcode Gate */}
            {onReset && (
              <button
                onClick={onReset}
                title="Return to Access Gate"
                className="p-1.5 rounded-full hover:bg-white/10 text-[#A88B83] hover:text-white transition-all ml-2"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
