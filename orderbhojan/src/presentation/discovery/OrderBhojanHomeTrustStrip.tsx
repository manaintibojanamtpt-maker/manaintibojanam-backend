import { IndianRupee, ShieldCheck, BadgeCheck, Sparkles, Receipt } from 'lucide-react';
import { GlassCard } from '@bhojan/storefront-design-system/primitives/GlassCard';
import { PRICING_TRUST } from '@/features/experience/domain/pricingTrustCopy';

const TRUST_ITEMS = [
  { id: 'prices', label: PRICING_TRUST.stripKitchenPrices, icon: IndianRupee },
  { id: 'zero-fee', label: PRICING_TRUST.stripZeroFee, icon: Receipt },
  { id: 'no-hidden', label: PRICING_TRUST.stripNoHidden, icon: ShieldCheck },
  { id: 'verified', label: 'Verified kitchens', icon: BadgeCheck },
  { id: 'home-style', label: 'Home-style food', icon: Sparkles },
] as const;

export function OrderBhojanHomeTrustStrip() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar md:grid md:grid-cols-5 md:overflow-visible">
      {TRUST_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <GlassCard
            key={item.id}
            hoverEffect={false}
            className="min-w-[9.5rem] shrink-0 !rounded-2xl !p-4 md:min-w-0"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e85d04]/15">
                <Icon className="h-5 w-5 text-[#e85d04]" aria-hidden />
              </div>
              <span className="text-sm font-semibold text-[#fff8f0]">{item.label}</span>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}
