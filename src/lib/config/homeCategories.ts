import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDb } from '../firebase-db';
import { HomeCategory } from '../../types';

export const PLATFORM_CONFIG_COLLECTION = 'platform_config';
export const HOME_CATEGORIES_DOC = 'home_categories';

export interface HomeCategoriesConfig {
  categories: HomeCategory[];
  updatedAt: number;
}

export async function fetchHomeCategories(): Promise<HomeCategory[]> {
  const db = getDb();
  const docRef = doc(db, PLATFORM_CONFIG_COLLECTION, HOME_CATEGORIES_DOC);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    return [];
  }
  return (snap.data() as HomeCategoriesConfig).categories || [];
}

export async function saveHomeCategories(categories: HomeCategory[]): Promise<void> {
  const db = getDb();
  const docRef = doc(db, PLATFORM_CONFIG_COLLECTION, HOME_CATEGORIES_DOC);
  await setDoc(docRef, {
    categories,
    updatedAt: Date.now(),
  }, { merge: true });
}
