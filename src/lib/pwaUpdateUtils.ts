/** Installed home-screen PWA (Android/iOS standalone). */
export function isInstalledPwa(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

const SENSITIVE_ROUTE_PREFIXES = [
  '/checkout',
  '/owner/orders',
  '/owner/recipes',
  '/owner/menu',
  '/owner/inventory',
] as const;

function normalizePwaRoutePath(pathname: string): string {
  const storefrontMatch = pathname.match(/^\/k\/[^/]+(\/.*)?$/);
  if (storefrontMatch) {
    return storefrontMatch[1] || '/';
  }
  return pathname;
}

/** Routes and forms where an automatic reload would discard in-progress user work. */
export function isSensitivePwaUpdateRoute(pathname?: string): boolean {
  if (typeof window === 'undefined' && !pathname) return false;
  const path = normalizePwaRoutePath(pathname ?? window.location.pathname);
  return SENSITIVE_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function hasBlockingSwUpdateForm(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(document.querySelector('[data-blocking-sw-update]'));
}

export function isPwaUpdateReloadBlocked(pathname?: string): boolean {
  return isSensitivePwaUpdateRoute(pathname) || hasBlockingSwUpdateForm();
}

export async function checkServiceWorkerForUpdate(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.update();
  } catch (error) {
    console.warn('[PWA] Manual update check failed:', error);
  }
}
