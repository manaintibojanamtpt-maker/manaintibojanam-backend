import React, { memo } from 'react';
import { ShoppingBag, Star } from 'lucide-react';
import { marketingDemoData } from '../../config/demoData';

const DEMO_ITEMS = [
  { name: 'Chicken Biryani', price: '₹249', tag: 'Bestseller' },
  { name: 'Paneer Butter Masala', price: '₹199', tag: 'Popular' },
  { name: 'Masala Dosa', price: '₹89', tag: 'Breakfast' },
] as const;

export const StorefrontPreviewMockup = memo(function StorefrontPreviewMockup() {
  return (
    <div
      className="relative w-full max-w-lg mx-auto marketing-hero-enter"
      aria-label="Customer storefront preview"
    >
      <div
        className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-[#FF7A00]/[0.06] blur-3xl"
        aria-hidden
      />
      <div className="relative marketing-hero-glass-card rounded-[1.35rem] sm:rounded-[1.75rem] border border-white/[0.08] overflow-hidden shadow-[0_32px_64px_-24px_rgba(0,0,0,0.75)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#080808]/90">
          <span className="text-sm font-black text-white tracking-tight">
            Your<span className="text-[#FF7A00]">Kitchen</span>
          </span>
          <span className="text-[10px] font-mono text-neutral-500 truncate max-w-[55%]">
            {marketingDemoData.storefrontUrl}
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-3 bg-[#0A0A0A]/95">
          <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-[#FF7A00]/10 to-transparent p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#FF7A00] mb-1">Your brand</p>
            <h3 className="text-lg font-black text-white mb-1">Order direct — 0% commission</h3>
            <p className="text-xs text-neutral-400">Menu, checkout, and payments under your name.</p>
          </div>

          <div className="space-y-2">
            {DEMO_ITEMS.map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <div className="h-12 w-12 shrink-0 rounded-lg bg-gradient-to-br from-[#FF7A00]/25 to-[#1a1410] border border-white/[0.06]" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                    <span className="hidden sm:inline text-[9px] font-bold uppercase tracking-wide text-[#FF7A00]/80">
                      {item.tag}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star size={10} className="fill-[#FF7A00] text-[#FF7A00]" aria-hidden />
                    <span className="text-[10px] text-neutral-500">4.8 · 12 min prep</span>
                  </div>
                </div>
                <span className="text-sm font-bold text-white tabular-nums shrink-0">{item.price}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-xl bg-[#FF7A00] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <ShoppingBag size={16} aria-hidden />
              <span className="text-sm font-bold">View cart · 2 items</span>
            </div>
            <span className="text-sm font-black tabular-nums">₹338</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default StorefrontPreviewMockup;
