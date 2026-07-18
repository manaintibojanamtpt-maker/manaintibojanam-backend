type IdleDeadline = {
  readonly didTimeout: boolean;
  readonly timeRemaining: () => number;
};

function scheduleIdle(work: () => void): void {
  if (typeof window === 'undefined') return;

  const requestIdle = (
    window as Window & {
      requestIdleCallback?: (callback: (deadline: IdleDeadline) => void, options?: { timeout: number }) => number;
    }
  ).requestIdleCallback;

  if (requestIdle) {
    requestIdle(() => work(), { timeout: 3000 });
    return;
  }

  window.setTimeout(work, 1500);
}

export function preloadMarketplaceRouteChunks(): void {
  scheduleIdle(() => {
    void import('@/features/restaurant');
    void import('@/features/food/ui/FoodRoutePage');
    void import('@/features/checkout');
  });
}
