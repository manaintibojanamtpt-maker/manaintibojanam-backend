export const checkoutKeys = {
  all: ['checkout'] as const,
  prepare: (signature: string) => [...checkoutKeys.all, 'prepare', signature] as const,
};

export const CHECKOUT_PREPARE_STALE_MS = 30_000;
export const CHECKOUT_PREPARE_GC_MS = 5 * 60_000;
