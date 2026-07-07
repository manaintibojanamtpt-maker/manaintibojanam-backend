import type { Firestore } from 'firebase-admin/firestore';
import { buildMarketplaceQuote, type MarketplaceQuoteLine, type MarketplaceQuoteRequest } from './projectCheckout.js';

export interface CartValidationIssue {
  itemId: string;
  code: 'NOT_FOUND' | 'UNAVAILABLE' | 'PRICE_CHANGED';
  message: string;
}

export async function validateMarketplaceCart(
  db: Firestore,
  request: MarketplaceQuoteRequest,
): Promise<{ valid: boolean; quote: Awaited<ReturnType<typeof buildMarketplaceQuote>>['quote']; issues: CartValidationIssue[] }> {
  const issues: CartValidationIssue[] = [];
  const { tenantId, quote } = await buildMarketplaceQuote(db, request);

  const snapshot = await db.collection('menu').where('tenantId', '==', tenantId).get();
  const menuById = new Map(snapshot.docs.map((doc) => [doc.id, doc.data() as Record<string, unknown>]));

  for (const line of request.lines as MarketplaceQuoteLine[]) {
    const itemId = String(line.itemId ?? '').trim();
    const menuItem = menuById.get(itemId);
    if (!menuItem) {
      issues.push({ itemId, code: 'NOT_FOUND', message: 'Item no longer on the menu' });
      continue;
    }
    if (menuItem.isAvailable === false || menuItem.isActive === false) {
      issues.push({ itemId, code: 'UNAVAILABLE', message: 'Item is currently unavailable' });
    }
    const livePrice = Number(menuItem.price ?? 0);
    if (line.unitPrice != null && Math.round(Number(line.unitPrice)) !== Math.round(livePrice)) {
      issues.push({ itemId, code: 'PRICE_CHANGED', message: 'Price updated since you added this item' });
    }
  }

  return { valid: issues.length === 0, quote, issues };
}
