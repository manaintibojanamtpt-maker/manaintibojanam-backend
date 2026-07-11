import type { SearchResultItem } from '@/types/marketplace-search';
import { OrderBhojanKitchenCard } from '@/presentation/discovery/OrderBhojanKitchenCard';
import { MarketplaceSearchResultCardView } from '@bhojan/storefront-design-system/marketplace/MarketplaceSearchResultCard';
import { mapSearchItemToResultCard } from './mapSearchItemToResultCard';
import { trackSearchEvent } from '@/features/search/analytics/searchAnalytics';

export interface OrderBhojanSearchResultRowProps {
  readonly item: SearchResultItem;
  readonly query: string;
  readonly onSelect?: (label: string) => void;
}

export function OrderBhojanSearchResultRow({ item, query, onSelect }: OrderBhojanSearchResultRowProps) {
  const trackClick = () => {
    trackSearchEvent('search_result_click', {
      query,
      resultId: item.id,
      resultType: item.type,
    });
    onSelect?.(item.label);
  };

  if (item.type === 'restaurant' && item.restaurant) {
    return (
      <div
        className="w-full"
        onClick={trackClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            trackClick();
          }
        }}
        role="button"
        tabIndex={0}
      >
        <OrderBhojanKitchenCard restaurant={item.restaurant} width="100%" className="w-full !min-w-0" />
      </div>
    );
  }

  const resultCard = mapSearchItemToResultCard(item);

  return (
    <div
      onClick={trackClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          trackClick();
        }
      }}
      role="button"
      tabIndex={0}
      className="w-full"
    >
      <MarketplaceSearchResultCardView
        result={resultCard}
        query={query}
        onResultClick={() => trackClick()}
      />
    </div>
  );
}
