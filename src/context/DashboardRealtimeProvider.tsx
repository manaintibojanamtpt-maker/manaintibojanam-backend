import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useOwnerTenantId } from '../hooks/useOwnerTenantId';
import { fetchOwnerOrdersList } from '../lib/ownerOrdersReads';
import type { OwnerOrder } from '../lib/ownerOrdersReads';
import { fetchOwnerMenuItemsCached } from '../lib/ownerMenuCache';
import { fetchOwnerStoreOperations } from '../lib/tenantStoreStatusApi';
import {
  resolveStoreSettings,
  isTenantStoreOpenNow,
  getStoreClosedReason,
  getStoreClosedMessage,
  type ResolvedStoreSettings,
} from '../lib/tenantStoreOperations';
import type { MenuItem } from '../types';
import {
  computeLowStockAlerts,
  computePendingOrders,
  DASHBOARD_ORDERS_LIMIT,
  DASHBOARD_REALTIME_POLL_MS,
  filterActiveOrders,
  type LowStockAlert,
} from './dashboardRealtimeHelpers';

interface DashboardOrdersSlice {
  orders: OwnerOrder[];
  activeOrders: OwnerOrder[];
  loading: boolean;
  error: unknown | null;
}

interface DashboardMenuSlice {
  items: MenuItem[];
  menuCount: number;
  lowStockAlerts: LowStockAlert[];
  loading: boolean;
  error: unknown | null;
}

interface DashboardStoreStatusSlice {
  settings: ResolvedStoreSettings | null;
  loading: boolean;
  error: unknown | null;
  isOpen: boolean;
  closedReason: ReturnType<typeof getStoreClosedReason>;
  closedMessage: string;
  isStoreOpenNow: () => boolean;
}

interface DashboardPendingOrdersSlice {
  pendingCount: number;
  pendingOrders: OwnerOrder[];
}

interface DashboardMetaContextValue {
  tenantId: string | null;
  pollMs: number;
  refreshNow: () => Promise<void>;
}

const DashboardOrdersContext = createContext<DashboardOrdersSlice | null>(null);
const DashboardMenuContext = createContext<DashboardMenuSlice | null>(null);
const DashboardStoreStatusContext = createContext<DashboardStoreStatusSlice | null>(null);
const DashboardPendingOrdersContext = createContext<DashboardPendingOrdersSlice | null>(null);
const DashboardMetaContext = createContext<DashboardMetaContextValue | null>(null);

const EMPTY_ORDERS: DashboardOrdersSlice = {
  orders: [],
  activeOrders: [],
  loading: true,
  error: null,
};

const EMPTY_MENU: DashboardMenuSlice = {
  items: [],
  menuCount: 0,
  lowStockAlerts: [],
  loading: true,
  error: null,
};

const EMPTY_STORE: DashboardStoreStatusSlice = {
  settings: null,
  loading: true,
  error: null,
  isOpen: false,
  closedReason: null,
  closedMessage: '',
  isStoreOpenNow: () => false,
};

export const DashboardRealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const tenantId = useOwnerTenantId();
  const [orders, setOrders] = useState<OwnerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<unknown | null>(null);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState<unknown | null>(null);

  const [storeSettings, setStoreSettings] = useState<ResolvedStoreSettings | null>(null);
  const [storeLoading, setStoreLoading] = useState(true);
  const [storeError, setStoreError] = useState<unknown | null>(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const pollInFlightRef = useRef(false);

  const refreshNow = useCallback(async () => {
    if (!tenantId || pollInFlightRef.current) return;
    pollInFlightRef.current = true;

    try {
      const [ordersResult, menuResult, storeResult] = await Promise.allSettled([
        fetchOwnerOrdersList(tenantId, DASHBOARD_ORDERS_LIMIT),
        fetchOwnerMenuItemsCached(tenantId),
        fetchOwnerStoreOperations(tenantId),
      ]);

      if (ordersResult.status === 'fulfilled') {
        setOrders(ordersResult.value);
        setOrdersError(null);
      } else {
        setOrdersError(ordersResult.reason);
        console.error('Dashboard realtime orders poll failed:', ordersResult.reason);
      }
      setOrdersLoading(false);

      if (menuResult.status === 'fulfilled') {
        setMenuItems(menuResult.value.items);
        setMenuError(null);
      } else {
        setMenuError(menuResult.reason);
        console.error('Dashboard realtime menu poll failed:', menuResult.reason);
      }
      setMenuLoading(false);

      if (storeResult.status === 'fulfilled') {
        setStoreSettings(
          resolveStoreSettings({
            storeOperations: storeResult.value.storeOperations,
          }),
        );
        setStoreError(null);
      } else {
        setStoreError(storeResult.reason);
        console.error('Dashboard realtime store status poll failed:', storeResult.reason);
      }
      setStoreLoading(false);
    } finally {
      pollInFlightRef.current = false;
    }
  }, [tenantId]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!tenantId) {
      setOrders([]);
      setMenuItems([]);
      setStoreSettings(null);
      setOrdersLoading(false);
      setMenuLoading(false);
      setStoreLoading(false);
      setOrdersError(null);
      setMenuError(null);
      setStoreError(null);
      return;
    }

    setOrdersLoading(true);
    setMenuLoading(true);
    setStoreLoading(true);

    void refreshNow();
    const timer = window.setInterval(() => {
      void refreshNow();
    }, DASHBOARD_REALTIME_POLL_MS);

    return () => window.clearInterval(timer);
  }, [tenantId, refreshNow]);

  const activeOrders = useMemo(() => filterActiveOrders(orders), [orders]);
  const pendingOrders = useMemo(() => computePendingOrders(orders), [orders]);
  const pendingCount = pendingOrders.length;
  const lowStockAlerts = useMemo(() => computeLowStockAlerts(menuItems), [menuItems]);

  const isOpen = useMemo(
    () => isTenantStoreOpenNow(storeSettings, currentTime),
    [storeSettings, currentTime],
  );
  const closedReason = useMemo(
    () => getStoreClosedReason(storeSettings, currentTime),
    [storeSettings, currentTime],
  );
  const closedMessage = useMemo(
    () => getStoreClosedMessage(storeSettings, currentTime),
    [storeSettings, currentTime],
  );
  const isStoreOpenNow = useCallback(
    () => isTenantStoreOpenNow(storeSettings, currentTime),
    [storeSettings, currentTime],
  );

  const ordersValue = useMemo<DashboardOrdersSlice>(
    () => ({
      orders,
      activeOrders,
      loading: ordersLoading,
      error: ordersError,
    }),
    [orders, activeOrders, ordersLoading, ordersError],
  );

  const menuValue = useMemo<DashboardMenuSlice>(
    () => ({
      items: menuItems,
      menuCount: menuItems.length,
      lowStockAlerts,
      loading: menuLoading,
      error: menuError,
    }),
    [menuItems, lowStockAlerts, menuLoading, menuError],
  );

  const storeStatusValue = useMemo<DashboardStoreStatusSlice>(
    () => ({
      settings: storeSettings,
      loading: storeLoading,
      error: storeError,
      isOpen,
      closedReason,
      closedMessage,
      isStoreOpenNow,
    }),
    [storeSettings, storeLoading, storeError, isOpen, closedReason, closedMessage, isStoreOpenNow],
  );

  const pendingValue = useMemo<DashboardPendingOrdersSlice>(
    () => ({
      pendingCount,
      pendingOrders,
    }),
    [pendingCount, pendingOrders],
  );

  const metaValue = useMemo<DashboardMetaContextValue>(
    () => ({
      tenantId,
      pollMs: DASHBOARD_REALTIME_POLL_MS,
      refreshNow,
    }),
    [tenantId, refreshNow],
  );

  return (
    <DashboardMetaContext.Provider value={metaValue}>
      <DashboardOrdersContext.Provider value={ordersValue}>
        <DashboardMenuContext.Provider value={menuValue}>
          <DashboardStoreStatusContext.Provider value={storeStatusValue}>
            <DashboardPendingOrdersContext.Provider value={pendingValue}>
              {children}
            </DashboardPendingOrdersContext.Provider>
          </DashboardStoreStatusContext.Provider>
        </DashboardMenuContext.Provider>
      </DashboardOrdersContext.Provider>
    </DashboardMetaContext.Provider>
  );
};

export function useDashboardOrders(): DashboardOrdersSlice {
  return useContext(DashboardOrdersContext) ?? EMPTY_ORDERS;
}

export function useDashboardMenu(): DashboardMenuSlice {
  return useContext(DashboardMenuContext) ?? EMPTY_MENU;
}

export function useDashboardStoreStatus(): DashboardStoreStatusSlice {
  return useContext(DashboardStoreStatusContext) ?? EMPTY_STORE;
}

export function useDashboardPendingOrders(): DashboardPendingOrdersSlice {
  return useContext(DashboardPendingOrdersContext) ?? { pendingCount: 0, pendingOrders: [] };
}

export function useDashboardRealtimePollMs(): number {
  return useContext(DashboardMetaContext)?.pollMs ?? DASHBOARD_REALTIME_POLL_MS;
}

export function useIsDashboardRealtimeActive(): boolean {
  return useContext(DashboardMetaContext) !== null;
}

export { DASHBOARD_REALTIME_POLL_MS, DASHBOARD_ORDERS_LIMIT };
