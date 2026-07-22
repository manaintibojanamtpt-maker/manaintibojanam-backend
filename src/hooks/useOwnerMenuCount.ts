import { useCallback, useEffect, useState } from 'react';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { useOwnerTenantId } from '../hooks/useOwnerTenantId';
import { fetchOwnerMenuItemsCached } from '../lib/ownerMenuCache';
import { FOUNDER_TENANT_ID, isFounderOwnerEmail } from '../config/founder';
import { useDashboardMenu, useIsDashboardRealtimeActive } from '../context/DashboardRealtimeProvider';

const MENU_COUNT_POLL_MS = 45_000;

/** Menu item count for owner setup progress — shared dashboard poll when inside owner layout. */
export function useOwnerMenuCount(): number {
  const dashboardActive = useIsDashboardRealtimeActive();
  const dashboardMenu = useDashboardMenu();
  const { tenantInfo, tenantId, tenantSlug } = useTenant();
  const { userProfile } = useAuth();
  const resolvedTenantId = useOwnerTenantId();
  const [fallbackMenuCount, setFallbackMenuCount] = useState(0);

  const ownedFallback = (userProfile?.ownedTenantIds ?? []).find(
    (id) => id && (id !== FOUNDER_TENANT_ID || isFounderOwnerEmail(userProfile?.email)),
  );
  const activeTenantId =
    resolvedTenantId || tenantId || tenantInfo?.id || tenantSlug || ownedFallback || null;

  const refresh = useCallback(async () => {
    if (!activeTenantId) {
      setFallbackMenuCount(0);
      return;
    }
    try {
      const response = await fetchOwnerMenuItemsCached(activeTenantId);
      setFallbackMenuCount(response.items?.length ?? 0);
    } catch (error) {
      console.error('useOwnerMenuCount failed:', error);
    }
  }, [activeTenantId]);

  useEffect(() => {
    if (dashboardActive || !activeTenantId) {
      if (!activeTenantId) setFallbackMenuCount(0);
      return;
    }

    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, MENU_COUNT_POLL_MS);
    return () => window.clearInterval(timer);
  }, [activeTenantId, dashboardActive, refresh]);

  if (dashboardActive) {
    return dashboardMenu.menuCount;
  }

  return fallbackMenuCount;
}
