import { Capacitor } from '@capacitor/core';
import { getAppConfig } from '@/config';
import { MarketplaceApiError } from '@/marketplace-api/errors';

/** Show API host / status hints on device debug and local DEV builds. */
export function shouldShowDiscoveryApiDebugHint(): boolean {
  if (import.meta.env?.DEV) return true;
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function truncateHost(baseUrl: string): string {
  try {
    const host = new URL(baseUrl).host;
    return host.length > 40 ? `${host.slice(0, 37)}…` : host;
  } catch {
    return baseUrl.slice(0, 40);
  }
}

/**
 * Consumer-facing discovery failure copy. Debug/native builds append truncated API host + status.
 */
export function formatDiscoveryLoadError(error: unknown): {
  readonly title: string;
  readonly description: string;
} {
  const title = 'Could not load restaurants';
  let description = 'Check your connection and try again.';

  if (!shouldShowDiscoveryApiDebugHint()) {
    return { title, description };
  }

  const host = truncateHost(getAppConfig().marketplaceApiBaseUrl);
  const status =
    error instanceof MarketplaceApiError && typeof error.status === 'number'
      ? String(error.status)
      : error instanceof MarketplaceApiError
        ? error.code
        : error instanceof Error
          ? error.name
          : 'unknown';

  description = `Check your connection and try again. (${host} · ${status})`;
  return { title, description };
}
