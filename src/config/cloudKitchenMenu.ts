import { collection, doc, getDocs, query, where, writeBatch, serverTimestamp } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';

/** Starter menu for cloud-kitchen onboarding — popular South Indian items */
export const CLOUD_KITCHEN_TEMPLATE_ITEMS = [
  { name: 'Idli (3)', price: 70, category: 'Breakfast', type: 'veg', isVeg: true, description: 'Soft steamed idlis with sambar and coconut chutney.' },
  { name: 'Plain Dosa', price: 50, category: 'Breakfast', type: 'veg', isVeg: true, description: 'Crispy golden dosa with chutney and sambar.' },
  { name: 'Masala Dosa', price: 80, category: 'Breakfast', type: 'veg', isVeg: true, description: 'Crispy dosa with spiced potato masala filling.' },
  { name: 'Sambar Rice', price: 119, category: 'Meals', type: 'veg', isVeg: true, description: 'Hot sambar rice with lentil stew and tempering.' },
  { name: 'Curd Rice', price: 129, category: 'Meals', type: 'veg', isVeg: true, description: 'Creamy curd rice with mild seasoning.' },
  { name: 'Veg Fried Rice', price: 99, category: 'Rice', type: 'veg', isVeg: true, description: 'Classic veg fried rice with crunchy vegetables.' },
  { name: 'Chicken Fried Rice', price: 189, category: 'Rice', type: 'non-veg', isVeg: false, description: 'Chicken fried rice with tender meat and crisp veggies.' },
  { name: 'Andhra Veg Thali (Mini)', price: 149, category: 'Thali', type: 'veg', isVeg: true, description: 'Compact Andhra veg thali for a lighter meal.' },
];

export async function seedCloudKitchenTemplate(tenantId: string): Promise<number> {
  const db = getDb();
  const existing = await getDocs(query(collection(db, 'menu'), where('tenantId', '==', tenantId)));
  if (existing.size >= 3) {
    throw new Error('Menu already has items. Delete existing items first or add manually.');
  }

  const batch = writeBatch(db);
  const existingNames = new Set(
    existing.docs.map((d) => (d.data().name || '').toString().trim().toLowerCase())
  );

  let added = 0;
  for (const item of CLOUD_KITCHEN_TEMPLATE_ITEMS) {
    if (existingNames.has(item.name.trim().toLowerCase())) continue;
    const ref = doc(collection(db, 'menu'));
    batch.set(ref, {
      tenantId,
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      type: item.type,
      isVeg: item.isVeg,
      isAvailable: true,
      image: '',
      createdAt: serverTimestamp(),
    });
    added += 1;
  }

  if (added === 0) {
    throw new Error('All template items already exist in your menu.');
  }

  await batch.commit();
  return added;
}
