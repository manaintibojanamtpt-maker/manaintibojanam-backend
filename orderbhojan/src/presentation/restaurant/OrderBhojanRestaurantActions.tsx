import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Share2 } from 'lucide-react';
import { GlassCard } from '@bhojan/storefront-design-system/primitives/GlassCard';
import { useFavoritesStore } from '@/features/experience/store/favoritesStore';

export interface OrderBhojanRestaurantActionsProps {
  readonly restaurantId: string;
  readonly name: string;
  readonly shareText: string;
}

export function OrderBhojanRestaurantActions({
  restaurantId,
  name,
  shareText,
}: OrderBhojanRestaurantActionsProps) {
  const isFavorite = useFavoritesStore((s) => s.isFavorite);
  const toggle = useFavoritesStore((s) => s.toggle);
  const favorite = isFavorite(restaurantId);
  const [burst, setBurst] = useState(false);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: name, text: shareText, url });
      return;
    }
    await navigator.clipboard.writeText(url);
  };

  const iconBtn =
    'flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white transition hover:border-[#FF7A00]/40';

  return (
    <GlassCard hoverEffect={false} className="!rounded-full !p-1.5">
      <div className="flex items-center gap-1">
        <button type="button" className={iconBtn} aria-label="Share restaurant" onClick={() => void share()}>
          <Share2 className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          className={`${iconBtn}${burst ? ' scale-110' : ''} ${favorite ? 'text-[#FF7A00]' : ''}`}
          aria-label={favorite ? `Remove ${name} from favorites` : `Add ${name} to favorites`}
          aria-pressed={favorite}
          onClick={() => {
            toggle(restaurantId);
            setBurst(true);
            window.setTimeout(() => setBurst(false), 420);
          }}
        >
          <Heart className={`h-5 w-5 ${favorite ? 'fill-current' : ''}`} aria-hidden />
        </button>
      </div>
    </GlassCard>
  );
}

export function OrderBhojanRestaurantStickyHeader({
  name,
  onBack,
}: {
  readonly name: string;
  readonly onBack?: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div
      className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#030303]/92 px-4 py-3 backdrop-blur-md"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <button
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white touch-manipulation"
          aria-label="Go back"
          onClick={onBack ?? (() => navigate(-1))}
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{name}</p>
      </div>
    </div>
  );
}
