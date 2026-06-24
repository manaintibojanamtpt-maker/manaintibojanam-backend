import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';
import { MenuItem, CartItem, Order } from '../types';

export interface RecommendationResult {
  items: MenuItem[];
  source: 'explicit' | 'upsell_pool' | 'heuristic';
}

/**
 * AI-Ready Recommendation Engine
 * Level 1: Explicit Pairings (pairWith)
 * Level 2: Upsell Pool (isUpsell === true sorted by priority)
 * Level 3: Heuristic Fallback (Category based)
 */
export const getUpsellRecommendations = (
  cartItems: CartItem[], 
  allMenu: MenuItem[]
): RecommendationResult => {
  const activeMenu = allMenu.filter(m => m.isAvailable && m.isActive !== false);
  const cartIds = new Set(cartItems.map(c => c.menuItemId || c.id));
  
  // Exclude items already in cart
  const availableCandidates = activeMenu.filter(m => !cartIds.has(m.id));

  if (availableCandidates.length === 0) return { items: [], source: 'heuristic' };

  // LEVEL 1: Explicit Pairings
  // Find all pairWith targets from items currently in cart
  const explicitPairingIds = new Set<string>();
  cartItems.forEach(cartItem => {
    const originalMenuItem = allMenu.find(m => m.id === (cartItem.menuItemId || cartItem.id));
    if (originalMenuItem?.pairWith && Array.isArray(originalMenuItem.pairWith)) {
      originalMenuItem.pairWith.forEach(id => explicitPairingIds.add(id));
    }
  });

  if (explicitPairingIds.size > 0) {
    const explicitlyPairedItems = availableCandidates.filter(m => explicitPairingIds.has(m.id));
    if (explicitlyPairedItems.length > 0) {
      return {
        items: explicitlyPairedItems.slice(0, 3),
        source: 'explicit'
      };
    }
  }

  // LEVEL 2: Upsell Pool
  const upsellPool = availableCandidates.filter(m => m.isUpsell === true);
  if (upsellPool.length > 0) {
    // Sort by upsellPriority DESC, then price ASC (cheaper impulse buys first)
    upsellPool.sort((a, b) => {
      const pA = a.upsellPriority || 0;
      const pB = b.upsellPriority || 0;
      if (pB !== pA) return pB - pA;
      return a.price - b.price;
    });
    return {
      items: upsellPool.slice(0, 3),
      source: 'upsell_pool'
    };
  }

  // LEVEL 3: Heuristic Fallback
  // Match likely add-ons (Beverages, Desserts, Sides)
  const heuristicPool = availableCandidates.filter(m => {
    const cat = (m.category || '').toLowerCase();
    return cat.includes('beverage') || 
           cat.includes('dessert') || 
           cat.includes('side') || 
           cat.includes('sweet') || 
           cat.includes('drink');
  });

  heuristicPool.sort((a, b) => a.price - b.price);

  return {
    items: heuristicPool.slice(0, 3),
    source: 'heuristic'
  };
};

/**
 * Smart Reorder Engine
 * Fetches latest 20 orders, calculates frequency.
 */
export const getSmartReorderRecommendations = async (
  userId: string,
  tenantId: string,
  allMenu: MenuItem[]
): Promise<MenuItem[]> => {
  try {
    const db = getDb();
    const q = query(
      collection(db, 'orders'),
      where('tenantId', '==', tenantId),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return [];

    const itemFrequencies = new Map<string, number>();

    snapshot.docs.forEach(doc => {
      const order = doc.data() as Order;
      if (order.status === 'CANCELLED' || order.status === 'REJECTED') return;
      
      (order.items || []).forEach(item => {
        const id = item.menuItemId || (item as any).id;
        itemFrequencies.set(id, (itemFrequencies.get(id) || 0) + item.quantity);
      });
    });

    if (itemFrequencies.size === 0) return [];

    // Sort by frequency DESC
    const sortedIds = Array.from(itemFrequencies.entries())
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);

    // Map back to active live menu items
    const reorderItems: MenuItem[] = [];
    for (const id of sortedIds) {
      const liveItem = allMenu.find(m => m.id === id && m.isAvailable && m.isActive !== false);
      if (liveItem) {
        reorderItems.push(liveItem);
      }
      if (reorderItems.length >= 5) break; // limit to 5 reorder suggestions
    }

    return reorderItems;
  } catch (error) {
    console.error("Smart reorder fetch failed:", error);
    return [];
  }
};
