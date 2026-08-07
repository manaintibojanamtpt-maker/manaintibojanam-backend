/** Round coords so prefetch/open share the same React Query key (avoid skeleton on kitchen open). */
export function foodCoordKey(value: number | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return Number(value.toFixed(3));
}

export const foodKeys = {
  all: ['food'] as const,
  menu: (slug: string, lat?: number, lng?: number) =>
    [...foodKeys.all, 'menu', slug, foodCoordKey(lat), foodCoordKey(lng)] as const,
  recommended: (slug: string) => [...foodKeys.all, 'recommended', slug] as const,
  bestsellers: (slug: string) => [...foodKeys.all, 'bestsellers', slug] as const,
};

export const FOOD_STALE_TIME_MS = 60_000;
export const FOOD_GC_TIME_MS = 10 * 60_000;
