/** Round coords so discovery prefetch and kitchen open share the same cache key. */
export function restaurantCoordKey(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(3));
}

export const restaurantKeys = {
  all: ['restaurant'] as const,
  experience: (slug: string, lat: number, lng: number) =>
    [
      ...restaurantKeys.all,
      'experience',
      slug,
      restaurantCoordKey(lat),
      restaurantCoordKey(lng),
    ] as const,
  gallery: (slug: string) => [...restaurantKeys.all, 'gallery', slug] as const,
  offers: (slug: string) => [...restaurantKeys.all, 'offers', slug] as const,
  highlights: (slug: string) => [...restaurantKeys.all, 'highlights', slug] as const,
};

export const RESTAURANT_STALE_TIME_MS = 60_000;
export const RESTAURANT_GC_TIME_MS = 10 * 60_000;
