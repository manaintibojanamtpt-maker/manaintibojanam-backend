import { useQuery } from '@tanstack/react-query';
import { getFirebaseFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface HomeCategory {
  id: string;
  label: string;
  imageUrl: string;
  sequence: number;
}

export function useHomeCategories() {
  return useQuery({
    queryKey: ['home_categories'],
    queryFn: async () => {
      const db = getFirebaseFirestore();
      if (!db) {
        throw new Error('Firestore not initialized');
      }
      const docRef = doc(db, 'platform_config', 'home_categories');
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        return [];
      }
      const data = snap.data();
      return (data.categories || []) as HomeCategory[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
