import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { getMenuTenantQueryKeys } from '../lib/menuTenantKeys';

/** Live menu item count for owner setup progress (matches slug + doc id). */
export function useOwnerMenuCount(): number {
  const { tenantInfo, tenantId, tenantSlug } = useTenant();
  const { userProfile } = useAuth();
  const [menuCount, setMenuCount] = useState(0);

  const keys = getMenuTenantQueryKeys(
    tenantInfo,
    tenantId || tenantSlug || userProfile?.ownedTenantIds?.[0],
  );

  useEffect(() => {
    if (keys.length === 0) {
      setMenuCount(0);
      return;
    }

    const db = getDb();
    const docIdsByKey = new Map<string, Set<string>>();

    const recompute = () => {
      const merged = new Set<string>();
      docIdsByKey.forEach((ids) => ids.forEach((id) => merged.add(id)));
      setMenuCount(merged.size);
    };

    const unsubs = keys.map((key) => {
      const menuQuery = query(collection(db, 'menu'), where('tenantId', '==', key));
      return onSnapshot(
        menuQuery,
        (snap) => {
          docIdsByKey.set(key, new Set(snap.docs.map((d) => d.id)));
          recompute();
        },
        (err) => console.error('useOwnerMenuCount listener failed:', key, err),
      );
    });

    return () => unsubs.forEach((u) => u());
  }, [keys.join('|')]);

  return menuCount;
}
