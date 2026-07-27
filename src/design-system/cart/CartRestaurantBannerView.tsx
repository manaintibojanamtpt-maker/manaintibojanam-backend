import { Store } from 'lucide-react';
import { GlassCard } from '../primitives/GlassCard';
import { SoftButton } from '../primitives/SoftButton';
import type { CartRestaurantBannerViewModel } from './types';

export interface CartRestaurantBannerViewProps {
  readonly restaurant: CartRestaurantBannerViewModel;
  readonly onMenu: () => void;
}

export function CartRestaurantBannerView({ restaurant, onMenu }: CartRestaurantBannerViewProps) {
  return (
    <GlassCard hoverEffect={false} className="!rounded-2xl !p-4">
      <div className="flex items-center gap-3" aria-label="Restaurant">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e85d04]/15 text-[#e85d04]"
          aria-hidden
        >
          <Store className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold tracking-tight text-white">{restaurant.name}</p>
          <p className="text-sm text-white/60">{restaurant.meta}</p>
        </div>
        <SoftButton type="button" tone="ghost" size="compact" onClick={onMenu}>
          {restaurant.menuActionLabel}
        </SoftButton>
      </div>
    </GlassCard>
  );
}
