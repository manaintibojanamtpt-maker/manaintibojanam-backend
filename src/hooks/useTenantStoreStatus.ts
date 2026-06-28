import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';
import { useTenant } from '../context/TenantContext';
import {
  getStoreClosedMessage,
  getStoreClosedReason,
  isTenantStoreOpenNow,
  resolveStoreSettings,
  ResolvedStoreSettings,
} from '../lib/tenantStoreOperations';

let legacyGlobalSettingsCache: Record<string, unknown> | null | undefined;

async function loadLegacyGlobalSettings(): Promise<Record<string, unknown> | null> {
  if (legacyGlobalSettingsCache !== undefined) {
    return legacyGlobalSettingsCache;
  }
  try {
    const legacySnap = await getDoc(doc(getDb(), 'adminSettings', 'global'));
    legacyGlobalSettingsCache = legacySnap.exists() ? legacySnap.data() : null;
  } catch {
    legacyGlobalSettingsCache = null;
  }
  return legacyGlobalSettingsCache;
}

export function useTenantStoreStatus() {
  const { tenantId, loading: tenantLoading } = useTenant();
  const [settings, setSettings] = useState<ResolvedStoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (tenantLoading) {
      setLoading(true);
      return;
    }

    if (!tenantId) {
      setSettings(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    setLoading(true);

    void loadLegacyGlobalSettings().then((legacy) => {
      if (cancelled) return;

      const tenantRef = doc(getDb(), 'tenants', tenantId);
      unsubscribe = onSnapshot(
        tenantRef,
        (snapshot) => {
          if (cancelled) return;
          const tenantData = snapshot.exists() ? snapshot.data() : null;
          setSettings(resolveStoreSettings(tenantData, legacy));
          setLoading(false);
        },
        () => {
          if (cancelled) return;
          setSettings(resolveStoreSettings(null, legacy));
          setLoading(false);
        },
      );
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [tenantId, tenantLoading]);

  const isOpen = useMemo(() => isTenantStoreOpenNow(settings, currentTime), [settings, currentTime]);
  const closedReason = useMemo(() => getStoreClosedReason(settings, currentTime), [settings, currentTime]);
  const closedMessage = useMemo(() => getStoreClosedMessage(settings, currentTime), [settings, currentTime]);

  return {
    settings,
    loading,
    isOpen,
    closedReason,
    closedMessage,
    isStoreOpenNow: () => isTenantStoreOpenNow(settings, currentTime),
  };
}
