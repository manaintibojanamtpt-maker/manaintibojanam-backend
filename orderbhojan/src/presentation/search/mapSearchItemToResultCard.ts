import type { MarketplaceSearchResultCard } from '@bhojan/storefront-design-system/marketplace/types';
import type { SearchResultItem } from '@/types/marketplace-search';

function titleFromSlug(slug: string | undefined): string | undefined {
  if (!slug?.trim()) return undefined;
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function readMetaString(meta: SearchResultItem['meta'], key: string): string | undefined {
  const value = meta?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function mapSearchItemToResultCard(item: SearchResultItem): MarketplaceSearchResultCard {
  const matchBadges = item.badge
    ? [{ id: 'matched' as const, label: item.badge }]
    : [];

  const isFood = item.type === 'food';
  const kitchenName =
    readMetaString(item.meta, 'restaurantName') ||
    (isFood ? item.subtitle?.trim() : undefined) ||
    (isFood ? titleFromSlug(item.slug) : undefined);
  const categoryLabel = readMetaString(item.meta, 'category');
  const price = typeof item.meta?.price === 'number' ? item.meta.price : undefined;

  const highlights = kitchenName
    ? [{ field: 'kitchen', snippet: kitchenName }]
    : item.subtitle
      ? [{ field: 'subtitle', snippet: item.subtitle }]
      : [];

  return {
    tenantId: item.id,
    slug: item.slug ?? item.id,
    name: item.label,
    distanceKm: typeof item.meta?.distanceKm === 'number' ? item.meta.distanceKm : 0,
    etaMins: typeof item.meta?.etaMins === 'number' ? item.meta.etaMins : undefined,
    rating: typeof item.meta?.rating === 'number' ? item.meta.rating : undefined,
    cuisineLabel: isFood ? kitchenName : item.subtitle,
    thumbnailUrl: item.imageUrl,
    isOpen: item.meta?.isOpen !== false,
    isServiceable: true,
    eligibilityLabel: isFood
      ? categoryLabel || (price != null ? `₹${price}` : 'Menu item')
      : item.type.replace(/_/g, ' '),
    matchBadges,
    highlights,
    storePath: item.slug ? `/restaurant/${item.slug}` : `/search?q=${encodeURIComponent(item.label)}`,
  };
}
