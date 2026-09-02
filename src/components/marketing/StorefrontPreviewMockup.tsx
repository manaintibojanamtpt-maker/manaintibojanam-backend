import React, { memo } from 'react';
import { ShoppingBag } from 'lucide-react';
import { marketingDemoData } from '../../config/demoData';
import { getMarketingFoodImage } from '../../config/marketingFoodImages';
import { FoodImage } from '../ui/FoodImage';

const DEMO_ITEMS = [
  { name: 'Chicken Biryani', tag: 'Bestseller' },
  { name: 'Paneer Butter Masala', tag: 'Popular' },
  { name: 'Masala Dosa', tag: 'Breakfast' },
] as const;

/**
 * Illustrative preview of a BhojanOS-powered restaurant storefront.
 * All content is labelled as example UI — no live business data is shown.
 * Prices are intentionally omitted (not fabricated).
 */
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
              const foodImage = getMarketingFoodImage(item.name);
              return (
                <div
                  key={item.name}
                  className="group flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.015] p-2.5 transition-all duration-200 hover:bg-white/[0.03]"
                >
                  <FoodImage
                    src={foodImage?.url}
                    alt={foodImage?.alt ?? item.name}
                    ratio="square"
                    zoomOnHover
                    className="h-14 w-14 sm:h-16 sm:w-16"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                      <span className="hidden sm:inline text-[8px] font-bold uppercase tracking-wide text-[#FF7A00]/70">
                        {item.tag}
                      </span>
                    </div>
                    {/* Real food imagery replaces the former placeholder — no fabricated rating/price */}
                  </div>
                  {/* Price intentionally omitted — not fabricated */}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between rounded-lg bg-[#FF7A00] px-3 py-2.5 text-white">
            <div className="flex items-center gap-1.5">
              <ShoppingBag size={15} aria-hidden />
              <span className="text-xs font-bold">Your storefront cart</span>
            </div>
            <span className="text-xs font-black tabular-nums">0 items</span>
          </div>
        </div>
      </div>

      <p className="mt-2 text-center text-[10px] text-neutral-600">
        Illustration — example storefront preview
      </p>
    </div>
  );
});

export default StorefrontPreviewMockup;
