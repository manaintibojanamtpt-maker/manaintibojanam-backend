import { useCallback, useEffect, useState } from 'react';
import { probeSameOriginReachable } from './probeConnectivity';

/** Presentation-only online status for discovery UX banners. Does not alter React Query or API behaviour. */
export function useOnlineStatus() {
  const [online, setOnline] = useState(true);

  const refresh = useCallback(async () => {
    const reachable = await probeSameOriginReachable();
    setOnline(reachable);
  }, []);

  useEffect(() => {
    void refresh();

    const handleConnectivityChange = () => {
      void refresh();
    };

    window.addEventListener('online', handleConnectivityChange);
    window.addEventListener('offline', handleConnectivityChange);
    return () => {
      window.removeEventListener('online', handleConnectivityChange);
      window.removeEventListener('offline', handleConnectivityChange);
    };
  }, [refresh]);

  return online;
}
