import React, { memo, useState } from 'react';
import { ShoppingBag, Star, UtensilsCrossed } from 'lucide-react';
import { marketingDemoData } from '../../config/demoData';

/* Marketing-specific food image configuration — verified working URLs */
const MARKETING_FOOD_IMAGES: Record<string, { url: string; alt: string }> = {
  'Chicken Biryani': {
    url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=400&fm=webp',
    alt: 'Steaming chicken biryani with saffron rice',
  },
  'Paneer Butter Masala': {
    url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&q=80&w=400&fm=webp',
    alt: 'Creamy paneer butter masala curry',
  },
  'Masala Dosa': {
    url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=400&fm=webp',
    alt: 'Crispy masala dosa with filling',
  },
};

const DEMO_ITEMS = [
  { name: 'Chicken Biryani', price: '₹249', tag: 'Bestseller' },
  { name: 'Paneer Butter Masala', price: '₹199', tag: 'Popular' },
  { name: 'Masala Dosa', price: '₹89', tag: 'Breakfast' },
] as const;

const FoodImage = memo(function FoodImage({ src, alt, name }: { src: string; alt: string; name: string }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  return (
    <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-lg overflow-hidden bg-[#0A0A0A]">
      {status === 'loading' && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#1a1410] to-[#0A0A0A]" />
      )}
      {status === 'error' ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#FF7A00]/15 to-[#1a1410]">
          <UtensilsCrossed size={20} className="text-[#FF7A00]/60" />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={`h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-300 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
});

export const StorefrontPreviewMockup = memo(function StorefrontPreviewMockup() {
  return (
    <div
      className="relative w-full max-w-md mx-auto marketing-hero-enter"
      aria-label="BhojanOS-powered restaurant storefront preview"
    >
      <div
        className="pointer-events-none absolute -inset-3 sm:-inset-4 rounded-[1.75rem] sm:rounded-[2rem] bg-[#FF7A00]/[0.04] blur-[80px] sm:blur-[100px]"
        aria-hidden
      />
      <div className="relative rounded-[1.25rem] sm:rounded-[1.5rem] border border-white/[0.05] overflow-hidden shadow-[0_32px_64px_-24px_rgba(0,0,0,0.65)]">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04] bg-[#070504]">
          <span className="text-sm font-black text-white tracking-tight">
            Your<span className="text-[#FF7A00]">Kitchen</span>
          </span>
          <span
            className="text-[10px] font-mono text-neutral-600 truncate max-w-[55%]"
            aria-label="storefront URL"
          >
            {marketingDemoData.storefrontUrl}
          </span>
        </div>

        <div className="p-3.5 sm:p-4 space-y-2.5 bg-[#070504]">
          <div className="rounded-lg border border-white/[0.04] p-3 sm:p-4">
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#FF7A00]/80 mb-1">
              Your brand
            </p>
            <h3 className="text-sm sm:text-base font-black text-white leading-tight">
              Order direct — 0% commission
            </h3>
            <p className="text-[11px] sm:text-xs text-neutral-500 mt-0.5">
              Menu, checkout, and payments under your name.
            </p>
          </div>

          <div className="space-y-2">
            {DEMO_ITEMS.map((item) => {
              const foodImage = MARKETING_FOOD_IMAGES[item.name];
              return (
                <div
                  key={item.name}
                  className="group flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.015] p-2.5 transition-all duration-200 hover:bg-white/[0.03]"
                >
                  <FoodImage
                    src={foodImage?.url || ''}
                    alt={foodImage?.alt || item.name}
                    name={item.name}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                      <span className="hidden sm:inline text-[8px] font-bold uppercase tracking-wide text-[#FF7A00]/70">
                        {item.tag}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star size={10} className="fill-[#FF7A00] text-[#FF7A00]" aria-hidden />
                      <span className="text-[10px] text-neutral-600">4.8 · 12 min prep</span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-white tabular-nums shrink-0">{item.price}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between rounded-lg bg-[#FF7A00] px-3 py-2.5 text-white">
            <div className="flex items-center gap-1.5">
              <ShoppingBag size={15} aria-hidden />
              <span className="text-xs font-bold">View cart · 2 items</span>
            </div>
            <span className="text-xs font-black tabular-nums">₹338</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default StorefrontPreviewMockup;
