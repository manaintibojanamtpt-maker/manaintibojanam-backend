import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isLiveStorefrontSyncEnabled } from '@/config/marketplaceQueryPolicy';
import { isNativePlatform } from '@/lib/nativePlatform';

/**
 * Soft refresh on native resume — revision sync handles pool invalidation;
 * this refetches stale active queries and refreshes customer session data.
 */
export function useNativeAppResumeSync(enabled = isLiveStorefrontSyncEnabled()): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !isNativePlatform()) return;

    let cancelled = false;
    let removeListener: (() => void) | undefined;

    void (async () => {
      const { App } = await import('@capacitor/app');
      const handle = await App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive || cancelled) return;
        void queryClient.refetchQueries({ stale: true, type: 'active' });
        void queryClient.invalidateQueries({ queryKey: ['customer', 'profile'] });
      });
      removeListener = () => void handle.remove();
    })();

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, [enabled, queryClient]);
}
