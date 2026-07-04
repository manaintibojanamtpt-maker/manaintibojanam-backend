import { Avatar, Badge, Card, Skeleton, Text } from '@bhojan/design-system';
import type { SearchResultItem } from '@/types/marketplace-search';
import { DiscoveryRestaurantCard } from '@/features/discovery/ui/DiscoveryRestaurantCard';
import { useBlurUpImage } from '@/features/experience/hooks/useBlurUpImage';
import { trackSearchEvent } from '../analytics/searchAnalytics';

export interface SearchResultRowProps {
  readonly item: SearchResultItem;
  readonly query: string;
  readonly onSelect?: (label: string) => void;
}

export function SearchResultRow({ item, query, onSelect }: SearchResultRowProps) {
  const cover = useBlurUpImage();

  if (item.type === 'restaurant' && item.restaurant) {
    return (
      <div
        className="ob-search-result ob-search-result--restaurant"
        onClick={() => {
          trackSearchEvent('search_result_click', {
            query,
            resultId: item.id,
            resultType: item.type,
          });
          onSelect?.(item.label);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect?.(item.label);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <DiscoveryRestaurantCard restaurant={item.restaurant} width="100%" />
      </div>
    );
  }

  return (
    <Card
      interactive
      className="ob-search-result ob-search-result--row"
      onClick={() => {
        trackSearchEvent('search_result_click', {
          query,
          resultId: item.id,
          resultType: item.type,
        });
        onSelect?.(item.label);
      }}
      aria-label={`${item.label}${item.subtitle ? `, ${item.subtitle}` : ''}`}
    >
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt=""
          className={`ob-search-result__thumb ${cover.className}`}
          loading="lazy"
          decoding="async"
          onLoad={cover.onLoad}
        />
      ) : (
        <Avatar src={undefined} alt="" size="md" />
      )}
      <div className="ob-search-result__body">
        <Text variant="bodySm" style={{ fontWeight: 700 }}>
          {item.label}
        </Text>
        {item.subtitle ? (
          <Text variant="caption" style={{ color: 'var(--bds-color-text-secondary)' }}>
            {item.subtitle}
          </Text>
        ) : null}
      </div>
      {item.badge ? <Badge variant="offer">{item.badge}</Badge> : null}
      <Badge variant="default">{item.type.replace('_', ' ')}</Badge>
    </Card>
  );
}

export function SearchResultsSkeleton() {
  return (
    <div className="ob-search-results-skeleton" aria-busy="true" aria-label="Loading search results">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="ob-search-result ob-search-result--row">
          <Skeleton width="3.25rem" height="3.25rem" />
          <div style={{ flex: 1 }}>
            <Skeleton height="1rem" width="60%" />
            <Skeleton height="0.75rem" width="40%" style={{ marginTop: '0.5rem' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
