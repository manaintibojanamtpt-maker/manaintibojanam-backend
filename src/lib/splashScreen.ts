import { isMarketingRequest as isMarketingRoute } from './marketingRoutes';

export function isMarketingPath(pathname?: string): boolean {
  if (typeof window === 'undefined') return false;
  const path = pathname ?? window.location.pathname;
  return isMarketingRoute(path, window.location.hostname);
}

let splashDismissed = false;

/** Remove the HTML splash overlay. Safe to call multiple times. */
export function dismissSplash(options?: { force?: boolean; maxWaitMs?: number }) {
  if (typeof document === 'undefined') return;
  if (splashDismissed && !options?.force) return;

  const loader = document.getElementById('initial-loader');
  if (!loader) {
    splashDismissed = true;
    return;
  }

  const win = window as Window & {
    __SPLASH_START_TIME__?: number;
    __SKIP_SPLASH__?: boolean;
  };

  const startTime = win.__SPLASH_START_TIME__ ?? Date.now();
  const elapsed = Date.now() - startTime;
  const marketing = isMarketingPath();
  const skipSplash = Boolean(win.__SKIP_SPLASH__) || marketing;
  const minDuration = skipSplash ? 0 : marketing ? 250 : 800;
  const maxWaitMs = options?.maxWaitMs ?? (marketing ? 400 : 2500);
  const timeToWait = Math.min(Math.max(0, minDuration - elapsed), maxWaitMs);

  window.setTimeout(() => {
    loader.style.opacity = '0';
    loader.style.pointerEvents = 'none';
    window.setTimeout(() => {
      loader.remove();
      splashDismissed = true;
    }, 400);
  }, timeToWait);
}

/** Never leave the splash overlay up if auth or the app shell stalls. */
export function scheduleSplashSafetyTimeout() {
  if (typeof window === 'undefined') return;

  const marketing = isMarketingPath();
  const safetyMs = marketing ? 1200 : 3500;

  window.setTimeout(() => dismissSplash({ force: true }), safetyMs);
}
