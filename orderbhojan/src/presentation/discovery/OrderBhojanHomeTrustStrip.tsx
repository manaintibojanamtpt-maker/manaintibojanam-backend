import { Clock, ShieldCheck, Truck, Sparkles, BadgeCheck } from 'lucide-react';
import { GlassCard } from '@bhojan/storefront-design-system/primitives/GlassCard';

const TRUST_ITEMS = [
  { id: 'fresh', label: 'Fresh daily', icon: Clock },
  { id: 'hygiene', label: 'Hygienic', icon: ShieldCheck },
  { id: 'verified', label: 'Verified', icon: BadgeCheck },
  { id: 'live', label: 'Live cooking', icon: Sparkles },
  { id: 'delivery', label: 'Fast delivery', icon: Truck },
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
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF7A00]/15">
                <Icon className="h-5 w-5 text-[#FF7A00]" aria-hidden />
              </div>
              <span className="text-sm font-bold text-white">{item.label}</span>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}
