import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import {
  isOrderSoundEnabled,
  isOrderSoundUnlocked,
  isStandalonePwa,
  playOrderAlertSound,
  setOrderSoundEnabled,
  unlockOrderSound,
} from '../lib/orderAlertSound';
import { useDashboardPendingOrders } from './DashboardRealtimeProvider';
import { detectNewOrderIds } from './dashboardRealtimeHelpers';
import { useOwnerTenantId } from '../hooks/useOwnerTenantId';

interface OrderAlertContextValue {
  pendingCount: number;
  soundEnabled: boolean;
  soundUnlocked: boolean;
  showSoundPrompt: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  enableSoundAlerts: () => Promise<boolean>;
  testSound: () => Promise<void>;
}

const OrderAlertContext = createContext<OrderAlertContextValue | null>(null);

export const OrderAlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const tenantId = useOwnerTenantId();
  const { pendingCount, pendingOrders } = useDashboardPendingOrders();
  const [soundEnabled, setSoundEnabledState] = React.useState(isOrderSoundEnabled);
  const [soundUnlocked, setSoundUnlocked] = React.useState(isOrderSoundUnlocked);
  const knownOrderIdsRef = useRef<Set<string> | null>(null);

  const enableSoundAlerts = useCallback(async () => {
    const ok = await unlockOrderSound();
    setSoundUnlocked(ok);
    if (ok) {
      setSoundEnabledState(true);
      setOrderSoundEnabled(true);
      toast.success('Order sound alerts enabled');
    }
    return ok;
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setOrderSoundEnabled(enabled);
    setSoundEnabledState(enabled);
  }, []);

  const testSound = useCallback(async () => {
    await enableSoundAlerts();
    await playOrderAlertSound({ force: true });
  }, [enableSoundAlerts]);

  useEffect(() => {
    const unlockOnInteraction = () => {
      if (isOrderSoundUnlocked()) {
        setSoundUnlocked(true);
        return;
      }
      void unlockOrderSound().then(setSoundUnlocked);
    };

    window.addEventListener('pointerdown', unlockOnInteraction, { once: true });
    window.addEventListener('keydown', unlockOnInteraction, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockOnInteraction);
      window.removeEventListener('keydown', unlockOnInteraction);
    };
  }, []);

  useEffect(() => {
    const { nextKnownIds, newOrderCount } = detectNewOrderIds(knownOrderIdsRef.current, pendingOrders);

    if (knownOrderIdsRef.current !== null && newOrderCount > 0) {
      void playOrderAlertSound();
      toast.success(newOrderCount === 1 ? 'New order arrived!' : `${newOrderCount} new orders arrived!`, {
        duration: 6000,
        icon: '🔔',
        style: { background: '#222', color: '#fff', fontWeight: 'bold' },
      });
    }

    knownOrderIdsRef.current = nextKnownIds;
  }, [pendingOrders]);

  useEffect(() => {
    knownOrderIdsRef.current = null;
  }, [tenantId]);

  const showSoundPrompt = isStandalonePwa() && !soundUnlocked;

  const value = useMemo(
    () => ({
      pendingCount,
      soundEnabled,
      soundUnlocked,
      showSoundPrompt,
      setSoundEnabled,
      enableSoundAlerts,
      testSound,
    }),
    [pendingCount, soundEnabled, soundUnlocked, showSoundPrompt, setSoundEnabled, enableSoundAlerts, testSound],
  );

  return <OrderAlertContext.Provider value={value}>{children}</OrderAlertContext.Provider>;
};

export function useOrderAlerts(): OrderAlertContextValue {
  const ctx = useContext(OrderAlertContext);
  if (!ctx) {
    return {
      pendingCount: 0,
      soundEnabled: true,
      soundUnlocked: false,
      showSoundPrompt: false,
      setSoundEnabled: () => {},
      enableSoundAlerts: async () => false,
      testSound: async () => {},
    };
  }
  return ctx;
}
