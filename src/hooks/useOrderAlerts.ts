import { useEffect, useRef, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const PENDING_STATUSES = [
  'PENDING',
  'CREATED',
  'PLACED',
  'PAYMENT_PENDING',
];

export function useOrderAlerts() {
  const { userProfile } = useAuth();
  const [hasInteracted, setHasInteracted] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const previousOrderCountRef = useRef<number>(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.volume = 0.8;

    const handleInteraction = () => setHasInteracted(true);
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  useEffect(() => {
    const tenantId = userProfile?.ownedTenantIds?.[0];
    if (!tenantId) {
      setPendingCount(0);
      return;
    }

    const ordersQuery = query(
      collection(getDb(), 'orders'),
      where('tenantId', '==', tenantId),
      where('status', 'in', PENDING_STATUSES)
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const activeCount = snapshot.docs.length;
      setPendingCount(activeCount);

      if (previousOrderCountRef.current !== -1 && activeCount > previousOrderCountRef.current) {
        if (hasInteracted && audioRef.current) {
          audioRef.current.play().catch((e) => console.error('Audio play failed:', e));
          toast.success('New order arrived!', {
            duration: 5000,
            icon: '🔔',
            style: { background: '#222', color: '#fff', fontWeight: 'bold' },
          });
        }
      }

      previousOrderCountRef.current = activeCount;
    }, (error) => {
      console.error('Order alert listener error:', error);
    });

    return () => unsubscribe();
  }, [userProfile?.ownedTenantIds, hasInteracted]);

  return { hasInteracted, pendingCount };
};
