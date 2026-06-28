const PREVIEW_KEY = 'storefrontCustomerPreview';

export function isCustomerPreviewMode(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(PREVIEW_KEY) === '1';
}

export function setCustomerPreviewMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (enabled) {
    sessionStorage.setItem(PREVIEW_KEY, '1');
  } else {
    sessionStorage.removeItem(PREVIEW_KEY);
  }
}

/** Strip ?preview=customer from URL and persist preview flag for this tab. */
export function activateCustomerPreviewFromUrl(): void {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  if (params.get('preview') !== 'customer') return;

  setCustomerPreviewMode(true);
  params.delete('preview');

  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  window.history.replaceState({}, '', nextUrl);
}

export function buildCustomerPreviewStoreUrl(storeUrl: string): string {
  try {
    const url = new URL(storeUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    url.searchParams.set('preview', 'customer');
    return `${url.pathname}${url.search}`;
  } catch {
    const separator = storeUrl.includes('?') ? '&' : '?';
    return `${storeUrl}${separator}preview=customer`;
  }
}

export function exitCustomerPreviewMode(): void {
  setCustomerPreviewMode(false);
}
