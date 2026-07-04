export const foodKeys = {
  all: ['food'] as const,
  menu: (slug: string, lat?: number, lng?: number) =>
    [...foodKeys.all, 'menu', slug, lat ?? 0, lng ?? 0] as const,
  recommended: (slug: string) => [...foodKeys.all, 'recommended', slug] as const,
  bestsellers: (slug: string) => [...foodKeys.all, 'bestsellers', slug] as const,
};

export const FOOD_STALE_TIME_MS = 60_000;
export const FOOD_GC_TIME_MS = 10 * 60_000;
