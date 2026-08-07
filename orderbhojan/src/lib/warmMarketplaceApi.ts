import { getAppConfig } from '@/config';
import { LIVE_MARKETPLACE_API_DEFAULT } from '@/config/environment';

/**
 * Wake the Render API early so checkout/discovery avoid cold-start "Failed to fetch".
 * Fire-and-forget — never blocks first paint.
 */
export function warmMarketplaceApi(): void {
  if (typeof window === 'undefined') return;
  try {
    const base = (getAppConfig().marketplaceApiBaseUrl || LIVE_MARKETPLACE_API_DEFAULT).replace(
      /\/$/,
      '',
    );
    if (!base.startsWith('http')) return;
    void fetch(`${base}/api/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    }).catch(() => {
      /* cold-start wake — ignore */
    });
  } catch {
    /* ignore */
  }
}
