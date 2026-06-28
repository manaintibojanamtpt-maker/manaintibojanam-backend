import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';
import {
  isOrderSoundEnabled,
  isOrderSoundUnlocked,
  isStandalonePwa,
  playOrderAlertSound,
  setOrderSoundEnabled,
  unlockOrderSound,
} from '../lib/orderAlertSound';

const NEW_ORDER_STATUSES = ['PENDING', 'CREATED', 'PLACED', 'PAYMENT_PENDING', 'PAYMENT_VERIFICATION'];

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
  const { userProfile } = useAuth();
  const tenantId = userProfile?.ownedTenantIds?.[0];
  const [pendingCount, setPendingCount] = useState(0);
  const [soundEnabled, setSoundEnabledState] = useState(isOrderSoundEnabled);
  const [soundUnlocked, setSoundUnlocked] = useState(isOrderSoundUnlocked);
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
    if (!tenantId) {
      setPendingCount(0);
      knownOrderIdsRef.current = null;
      return;
    }

    const ordersQuery = query(
      collection(getDb(), 'orders'),
      where('tenantId', '==', tenantId),
      where('status', 'in', NEW_ORDER_STATUSES),
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const docs = snapshot.docs;
        setPendingCount(docs.length);

        const currentIds = new Set(docs.map((docSnap) => docSnap.id));
        if (knownOrderIdsRef.current === null) {
          knownOrderIdsRef.current = currentIds;
          return;
        }

        let newOrders = 0;
        currentIds.forEach((id) => {
          if (!knownOrderIdsRef.current!.has(id)) newOrders += 1;
        });

        if (newOrders > 0) {
          void playOrderAlertSound();
          toast.success(newOrders === 1 ? 'New order arrived!' : `${newOrders} new orders arrived!`, {
            duration: 6000,
            icon: '🔔',
            style: { background: '#222', color: '#fff', fontWeight: 'bold' },
          });
        }

        knownOrderIdsRef.current = currentIds;
      },
      (error) => console.error('Order alert listener error:', error),
    );

    return () => unsubscribe();
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
