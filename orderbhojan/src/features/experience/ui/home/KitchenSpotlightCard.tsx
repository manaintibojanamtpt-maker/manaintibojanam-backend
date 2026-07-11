import type { RestaurantPublic } from '@/types/marketplace';
import { OrderBhojanKitchenCard } from '@/presentation/discovery/OrderBhojanKitchenCard';

export interface KitchenSpotlightCardProps {
  readonly restaurant: RestaurantPublic;
}

/**
 * @deprecated Presentation migrated to OrderBhojanKitchenCard spotlight variant (Phase 6 / 2B).
 */
export function KitchenSpotlightCard({ restaurant }: KitchenSpotlightCardProps) {
  return (
    <section aria-label={`${restaurant.displayName} — cooking now`}>
      <OrderBhojanKitchenCard restaurant={restaurant} variant="spotlight" imageLoading="eager" />
    </section>
  );
}
