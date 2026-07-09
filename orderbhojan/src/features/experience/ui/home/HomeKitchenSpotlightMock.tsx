import { Text } from '@bhojan/design-system';
import type { MockRestaurant } from '../../domain/experience.types';
import { HomeRestaurantPoster } from './HomeRestaurantPoster';

export interface HomeKitchenSpotlightMockProps {
  readonly restaurant: MockRestaurant;
  readonly sparseCopy?: string | null;
}

export function HomeKitchenSpotlightMock({ restaurant, sparseCopy }: HomeKitchenSpotlightMockProps) {
  return (
    <section className="ob-kitchen-spotlight" aria-label={`${restaurant.name} — cooking now`}>
      <div className="ob-kitchen-spotlight__card ob-stove-glow-frame ob-kitchen-spotlight__card--mock">
        <div className="ob-kitchen-spotlight__mock-poster">
          <HomeRestaurantPoster restaurant={restaurant} />
        </div>
        <div className="ob-kitchen-spotlight__body">
          <Text variant="caption" className="ob-kitchen-spotlight__eyebrow">
            Cooking now
          </Text>
          <Text variant="titleSm" as="h2" className="ob-kitchen-spotlight__name">
            {restaurant.name}
          </Text>
          <Text variant="bodySm" className="ob-kitchen-spotlight__trust">
            ★ {restaurant.rating.toFixed(1)} · {restaurant.cuisine} · Home food
          </Text>
        </div>
      </div>
      {sparseCopy ? (
        <Text variant="bodySm" className="ob-kitchen-spotlight__sparse-copy">
          {sparseCopy}
        </Text>
      ) : null}
    </section>
  );
}
