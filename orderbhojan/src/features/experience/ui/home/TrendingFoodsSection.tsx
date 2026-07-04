import { Rail, Text } from '@bhojan/design-system';
import { useTrendingFoods } from '../../hooks/useMockExperienceQuery';
import { MarketplaceFoodTile } from '../shared/MarketplaceFoodTile';
import { MenuSkeleton } from '../shared/ExperienceSkeletons';

export function TrendingFoodsSection() {
  const query = useTrendingFoods();

  return (
    <section className="ob-section ob-food-rail" aria-label="Trending foods">
      <div className="ob-section__header">
        <Text variant="subtitle" as="h2" className="ob-section__title">Trending Now</Text>
        <Text variant="caption" className="ob-section__hint">Hot picks</Text>
      </div>
      {query.isLoading ? (
        <MenuSkeleton />
      ) : (
        <Rail>
          {query.data?.map((item) => (
            <div key={item.id} style={{ width: '19rem', flexShrink: 0 }}>
              <MarketplaceFoodTile item={item} />
            </div>
          ))}
        </Rail>
      )}
    </section>
  );
}
