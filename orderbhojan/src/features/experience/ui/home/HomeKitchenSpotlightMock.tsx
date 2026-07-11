import type { MockRestaurant } from '../../domain/experience.types';
import { OrderBhojanMockKitchenCard } from '@/presentation/discovery/OrderBhojanMockKitchenCard';

export interface HomeKitchenSpotlightMockProps {
  readonly restaurant: MockRestaurant;
  readonly sparseCopy?: string | null;
}

export function HomeKitchenSpotlightMock({ restaurant, sparseCopy }: HomeKitchenSpotlightMockProps) {
  return (
    <section aria-label={`${restaurant.name} — cooking now`}>
      <OrderBhojanMockKitchenCard restaurant={restaurant} variant="spotlight" />
      {sparseCopy ? <p className="mt-3 text-sm text-white/60">{sparseCopy}</p> : null}
    </section>
  );
}
