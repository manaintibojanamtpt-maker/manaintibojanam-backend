import { useEffect, useState } from 'react';
import { useAuth } from '@/shared/providers/AuthProvider';
import { tryOpenNativeTrack } from './nativeTrackBridge';

/**
 * On tracking route mount: hand off to native Track when flags+cohort allow.
 * Hybrid UI stays mounted underneath as rollback when Activity/VC dismisses.
 */
export function useNativeTrackHandoff(orderId: string) {
  const { user } = useAuth();
  const [handedOff, setHandedOff] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    void (async () => {
      const result = await tryOpenNativeTrack({
        orderId,
        userEmail: user?.email ?? null,
        userId: user?.uid ?? null,
        source: 'route',
      });
      if (cancelled) return;
      setHandedOff(result.opened);
      setReason(result.reason);
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, user?.email, user?.uid]);

  return { handedOff, reason };
}
