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

export function useTenantStoreStatus() {
  const { tenantId } = useTenant();
  const [settings, setSettings] = useState<ResolvedStoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadSettings = async () => {
      try {
        const legacySnap = await getDoc(doc(getDb(), 'adminSettings', 'global'));
        const legacy = legacySnap.exists() ? legacySnap.data() : null;

        if (!cancelled) {
          setSettings(resolveStoreSettings(null, legacy));
        }
      } catch {
        if (!cancelled) {
          setSettings(resolveStoreSettings(null, null));
        }
      }
    };

    loadSettings();

    const tenantRef = doc(getDb(), 'tenants', tenantId);
    const unsubscribe = onSnapshot(
      tenantRef,
      (snapshot) => {
        const tenantData = snapshot.exists() ? snapshot.data() : null;
        getDoc(doc(getDb(), 'adminSettings', 'global'))
          .then((legacySnap) => {
            const legacy = legacySnap.exists() ? legacySnap.data() : null;
            setSettings(resolveStoreSettings(tenantData, legacy));
            setLoading(false);
          })
          .catch(() => {
            setSettings(resolveStoreSettings(tenantData, null));
            setLoading(false);
          });
      },
      () => {
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [tenantId]);

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
