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
        className="pointer-events-none absolute -inset-3 sm:-inset-4 rounded-[1.75rem] sm:rounded-[2rem] bg-[#D97706]/[0.03] blur-[80px]"
        aria-hidden
      />
      <div className="relative rounded-[1.25rem] sm:rounded-[1.5rem] border border-[#27272A] overflow-hidden shadow-2xl bg-[#18181B]">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#27272A] bg-[#111114]">
          <span className="text-sm font-black text-[#FAFAFA] tracking-tight">
            Your<span className="text-[#D97706]">Kitchen</span>
          </span>
          <span
            className="text-[10px] font-mono text-[#A1A1AA] truncate max-w-[55%]"
            aria-label="storefront URL"
          >
            {marketingDemoData.storefrontUrl}
          </span>
        </div>

        <div className="p-3.5 sm:p-4 space-y-2.5 bg-[#18181B]">
          <div className="rounded-sm border border-[#27272A] p-3 sm:p-4 bg-[#111114]">
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#D97706] mb-1">
              Your brand
            </p>
            <h3 className="text-sm sm:text-base font-black text-[#FAFAFA] leading-tight">
              Order direct — 0% commission
            </h3>
            <p className="text-[11px] sm:text-xs text-[#A1A1AA] mt-0.5">
              Menu, checkout, and payments under your name.
            </p>
          </div>

          <div className="space-y-2">
            {DEMO_ITEMS.map((item) => {
              const foodImage = getMarketingFoodImage(item.name);
              return (
                <div
                  key={item.name}
                  className="group flex items-center gap-3 rounded-sm border border-[#27272A] bg-[#111114] p-2.5 transition-all duration-200 hover:bg-[#27272A] hover:border-[#D97706]/40"
                >
                  <FoodImage
                    src={foodImage?.url}
                    alt={foodImage?.alt ?? item.name}
                    ratio="square"
                    zoomOnHover
                    className="h-14 w-14 sm:h-16 sm:w-16 rounded-sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-[#FAFAFA] truncate">{item.name}</p>
                      <span className="hidden sm:inline text-[8px] font-bold uppercase tracking-wide text-[#D97706] bg-[#D97706]/10 px-1.5 py-0.5 rounded">
                        {item.tag}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between rounded-sm bg-[#D97706] px-3.5 py-2.5 text-white shadow-none">
            <div className="flex items-center gap-1.5">
              <ShoppingBag size={15} aria-hidden />
              <span className="text-xs font-bold">Your storefront cart</span>
            </div>
            <span className="text-xs font-black tabular-nums">0 items</span>
          </div>
        </div>
      </div>

      <p className="mt-2 text-center text-[10px] text-[#8A8A8A]">
        Illustration — example storefront preview
      </p>
    </div>
  );
});

export default StorefrontPreviewMockup;
