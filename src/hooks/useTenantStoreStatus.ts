import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import {
  getStoreClosedMessage,
  getStoreClosedReason,
  isTenantStoreOpenNow,
  resolveStoreSettings,
  type ResolvedStoreSettings,
} from '../lib/tenantStoreOperations';
import { subscribeTenantStoreStatus } from '../lib/tenantStoreStatusReads';

export function useTenantStoreStatus() {
  const { tenantId, tenantSlug, loading: tenantLoading } = useTenant();
  const { currentUser } = useAuth();
  const location = useLocation();
  const [settings, setSettings] = useState<ResolvedStoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const useOwnerApi =
    location.pathname.startsWith('/owner') && !!currentUser && !!tenantId;
  const activeSlug = tenantSlug || tenantId || null;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (tenantLoading) {
      setLoading(true);
      return;
    }

    if (!activeSlug && !tenantId) {
      setSettings(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = subscribeTenantStoreStatus(
      tenantId ?? null,
      activeSlug,
      useOwnerApi,
      (next) => {
        setSettings(next);
        setLoading(false);
      },
      () => {
        setSettings(resolveStoreSettings(null));
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [tenantId, activeSlug, tenantLoading, useOwnerApi]);

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
