import type { MarketplaceSearchResultCard } from '@bhojan/storefront-design-system/marketplace/types';
import type { SearchResultItem } from '@/types/marketplace-search';

export function mapSearchItemToResultCard(item: SearchResultItem): MarketplaceSearchResultCard {
  const matchBadges = item.badge
    ? [{ id: 'matched' as const, label: item.badge }]
    : [];

  const highlights = item.subtitle
    ? [{ field: 'subtitle', snippet: item.subtitle }]
    : [];

  return {
    tenantId: item.id,
    slug: item.slug ?? item.id,
    name: item.label,
    distanceKm: typeof item.meta?.distanceKm === 'number' ? item.meta.distanceKm : 0,
    etaMins: typeof item.meta?.etaMins === 'number' ? item.meta.etaMins : undefined,
    rating: typeof item.meta?.rating === 'number' ? item.meta.rating : undefined,
    cuisineLabel: item.subtitle,
    thumbnailUrl: item.imageUrl,
    isOpen: item.meta?.isOpen !== false,
    isServiceable: true,
    eligibilityLabel: item.type.replace(/_/g, ' '),
    matchBadges,
    highlights,
    storePath: item.slug ? `/restaurant/${item.slug}` : `/search?q=${encodeURIComponent(item.label)}`,
  };
}
