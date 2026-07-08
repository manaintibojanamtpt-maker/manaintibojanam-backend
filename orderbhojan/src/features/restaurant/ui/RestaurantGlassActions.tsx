import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassSurface, Icon, Text } from '@bhojan/design-system';
import { useFavoritesStore } from '@/features/experience/store/favoritesStore';

export interface RestaurantGlassActionsProps {
  readonly restaurantId: string;
  readonly name: string;
  readonly shareText: string;
  readonly onBack?: () => void;
}

export function RestaurantGlassActions({
  restaurantId,
  name,
  shareText,
  onBack,
}: RestaurantGlassActionsProps) {
  const navigate = useNavigate();
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

  return (
    <GlassSurface className="ob-restaurant-px5__actions">
      <button
        type="button"
        className="ob-restaurant-px5__action-btn"
        aria-label="Go back"
        onClick={onBack ?? (() => navigate(-1))}
      >
        <Icon size={20} aria-hidden>
          <path d="M15 18l-6-6 6-6" />
        </Icon>
      </button>
      <div className="ob-restaurant-px5__actions-spacer" aria-hidden />
      <button
        type="button"
        className="ob-restaurant-px5__action-btn"
        aria-label="Share restaurant"
        onClick={() => void share()}
      >
        <Icon size={20} aria-hidden>
          <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
          <path d="M16 6l-4-4-4 4" />
          <path d="M12 2v13" />
        </Icon>
      </button>
      <button
        type="button"
        className={`ob-restaurant-px5__action-btn${burst ? ' ob-restaurant-px5__action-btn--burst' : ''}`}
        aria-label={favorite ? `Remove ${name} from favorites` : `Add ${name} to favorites`}
        aria-pressed={favorite}
        onClick={() => {
          toggle(restaurantId);
          setBurst(true);
          window.setTimeout(() => setBurst(false), 420);
        }}
      >
        <Icon size={20} aria-hidden>
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
        </Icon>
      </button>
    </GlassSurface>
  );
}

export function RestaurantStickyHeader({
  name,
  visible,
}: {
  readonly name: string;
  readonly visible: boolean;
}) {
  return (
    <div
      className={`ob-restaurant-px5__sticky-header${visible ? ' ob-restaurant-px5__sticky-header--visible' : ''}`}
      aria-hidden={!visible}
    >
      <Text variant="titleSm" className="ob-restaurant-px5__sticky-title">
        {name}
      </Text>
    </div>
  );
}
