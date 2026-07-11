import { ArrowLeft, Home } from 'lucide-react';
import { GlassCard } from '@bhojan/storefront-design-system/primitives/GlassCard';
import { ProfileImage } from '@bhojan/storefront-design-system/primitives/ProfileImage';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import {
  resolveRestaurantLogo,
  restaurantSlugFromString,
} from '@/features/restaurant/data/restaurant-photo-manifest';

export interface OrderBhojanFoodRestaurantStripProps {
  readonly slug: string;
  readonly name: string;
  readonly onBack: () => void;
  readonly onHome?: () => void;
}

export function OrderBhojanFoodRestaurantStrip({
  slug,
  name,
  onBack,
  onHome,
}: OrderBhojanFoodRestaurantStripProps) {
  const logo = resolveRestaurantLogo(restaurantSlugFromString(slug), 82);

  return (
    <header className="border-b border-white/10 bg-[#030303] px-4 py-3">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <SoftButton type="button" tone="ghost" size="compact" aria-label="Back to restaurant" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </SoftButton>
        {onHome ? (
          <SoftButton type="button" tone="ghost" size="compact" aria-label="Back to home" onClick={onHome}>
            <Home className="h-4 w-4" aria-hidden />
          </SoftButton>
        ) : null}
        <GlassCard hoverEffect={false} className="!flex !flex-1 !items-center !gap-3 !rounded-2xl !p-2">
          <ProfileImage name={name} imageUrl={logo.src} alt={`${name} logo`} className="h-10 w-10" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">From</p>
            <p className="truncate text-sm font-bold text-white">{name}</p>
          </div>
        </GlassCard>
      </div>
    </header>
  );
}
