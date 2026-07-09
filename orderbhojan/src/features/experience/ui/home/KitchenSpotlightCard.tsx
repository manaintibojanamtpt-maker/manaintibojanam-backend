import { useNavigate } from 'react-router-dom';
import { Badge, Text } from '@bhojan/design-system';
import type { RestaurantPublic } from '@/types/marketplace';
import { useRestaurantFeatureEnabled } from '@/features/restaurant';
import {
  cuisineLabel,
  formatDeliveryFee,
  formatDistance,
  formatEta,
  kitchenFormatLabel,
} from '@/features/discovery/utils/restaurantDisplay';
import { resolveRestaurantCover } from '@/features/restaurant/data/restaurant-photo-manifest';

export interface KitchenSpotlightCardProps {
  readonly restaurant: RestaurantPublic;
}

export function KitchenSpotlightCard({ restaurant }: KitchenSpotlightCardProps) {
  const navigate = useNavigate();
  const restaurantEnabled = useRestaurantFeatureEnabled();
  const cover = resolveRestaurantCover(restaurant.restaurantSlug, 88);
  const coverUrl =
    restaurant.coverUrl && !restaurant.coverUrl.includes('placehold.co')
      ? restaurant.coverUrl
      : cover.src;

  return (
    <section className="ob-kitchen-spotlight" aria-label={`${restaurant.displayName} — cooking now`}>
      <button
        type="button"
        className="ob-kitchen-spotlight__card ob-stove-glow-frame"
        onClick={() => {
          if (restaurantEnabled) {
            navigate(`/restaurant/${restaurant.restaurantSlug}`);
          }
        }}
      >
        <div className="ob-kitchen-spotlight__media">
          <img
            src={coverUrl}
            alt=""
            className="ob-kitchen-spotlight__img"
            loading="eager"
            decoding="async"
          />
          <div className="ob-kitchen-spotlight__scrim" aria-hidden />
          <span className="ob-kitchen-spotlight__badge">Cooking now</span>
        </div>
        <div className="ob-kitchen-spotlight__body">
          <Text variant="caption" className="ob-kitchen-spotlight__eyebrow">
            Home kitchen · {kitchenFormatLabel(restaurant.kitchenFormat)}
          </Text>
          <Text variant="titleSm" as="h2" className="ob-kitchen-spotlight__name">
            {restaurant.displayName}
          </Text>
          <Text variant="bodySm" className="ob-kitchen-spotlight__trust">
            ★ {(restaurant.rating ?? 4.5).toFixed(1)} · {cuisineLabel(restaurant)} · Home food
          </Text>
          <div className="ob-kitchen-spotlight__meta">
            <Badge variant="delivery">{formatEta(restaurant)}</Badge>
            <Badge variant="delivery">{formatDeliveryFee(restaurant)}</Badge>
            <Badge variant="default">{formatDistance(restaurant)}</Badge>
          </div>
        </div>
      </button>
    </section>
  );
}
