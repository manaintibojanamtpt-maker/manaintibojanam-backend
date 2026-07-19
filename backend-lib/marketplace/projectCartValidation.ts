import type { Firestore } from 'firebase-admin/firestore';
import {
  buildMarketplaceQuote,
  type BillQuote,
  type MarketplaceQuoteLine,
  type MarketplaceQuoteRequest,
} from './projectCheckout.js';

export type CartValidationIssueCode =
  | 'NOT_FOUND'
  | 'UNAVAILABLE'
  | 'PRICE_CHANGED'
  | 'ID_UPDATED';

export interface CartValidationIssue {
  itemId: string;
  code: CartValidationIssueCode;
  message: string;
  resolvedItemId?: string;
}

export interface CartValidationResult {
  valid: boolean;
  quote: BillQuote;
  issues: CartValidationIssue[];
  resolvedLines: MarketplaceQuoteLine[];
}

type TenantRaw = Record<string, unknown>;

const EMPTY_QUOTE: BillQuote = {
  subtotal: 0,
  gstAmount: 0,
  gstPercent: 0,
  packagingFee: 0,
  deliveryFee: 0,
  deliveryPending: false,
  discountAmount: 0,
  grandTotal: 0,
  taxLabel: 'Taxes and Charges',
  lineItems: [],
};

function normalizeMenuName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function loadTenantByRestaurantId(db: Firestore, restaurantId: string) {
  const trimmed = restaurantId.trim();
  if (!trimmed) return null;

  const direct = await db.collection('tenants').doc(trimmed).get();
  if (direct.exists) return { id: direct.id, raw: direct.data() as TenantRaw };

  const slugCandidates = new Set<string>([trimmed]);
  if (trimmed.startsWith('obr_')) slugCandidates.add(trimmed.slice(4));
  if (trimmed.startsWith('rest_')) slugCandidates.add(trimmed.slice(5).replace(/_/g, '-'));

  const slugQueries = await Promise.all(
    [...slugCandidates].map((slug) =>
      db.collection('tenants').where('slug', '==', slug).limit(1).get(),
    ),
  );

  for (const snap of slugQueries) {
    if (!snap.empty) {
      const doc = snap.docs[0];
      return { id: doc.id, raw: doc.data() as TenantRaw };
    }
  }

  return null;
}

function findAvailableMenuItemByName(
  menuById: Map<string, Record<string, unknown>>,
  name: string,
): { id: string; data: Record<string, unknown> } | null {
  const target = normalizeMenuName(name);
  if (!target) return null;

  for (const [id, data] of menuById) {
    if (data.isAvailable === false || data.isActive === false) continue;
    if (normalizeMenuName(String(data.name ?? '')) === target) {
      return { id, data };
    }
  }

  return null;
}

function isBlockingIssue(code: CartValidationIssueCode): boolean {
  return code === 'NOT_FOUND' || code === 'UNAVAILABLE';
}

export async function validateMarketplaceCart(
  db: Firestore,
  request: MarketplaceQuoteRequest,
): Promise<CartValidationResult> {
  const restaurantId = request.restaurantId?.trim();
  if (!restaurantId) {
    throw Object.assign(new Error('restaurantId is required'), { statusCode: 400 });
  }
  if (!Array.isArray(request.lines) || request.lines.length === 0) {
    throw Object.assign(new Error('At least one line item is required'), { statusCode: 400 });
  }

  const loaded = await loadTenantByRestaurantId(db, restaurantId);
  if (!loaded) throw Object.assign(new Error('Restaurant not found'), { statusCode: 404 });

  const snapshot = await db.collection('menu').where('tenantId', '==', loaded.id).get();
  const menuById = new Map(snapshot.docs.map((doc) => [doc.id, doc.data() as Record<string, unknown>]));

  const issues: CartValidationIssue[] = [];
  const resolvedLines: MarketplaceQuoteLine[] = [];

  for (const line of request.lines as MarketplaceQuoteLine[]) {
    const itemId = String(line.itemId ?? '').trim();
    const quantity = Math.max(1, Math.floor(Number(line.quantity ?? 1)));
    let menuItem = menuById.get(itemId);
    let resolvedItemId = itemId;

    if (!menuItem && line.name?.trim()) {
      const matched = findAvailableMenuItemByName(menuById, line.name);
      if (matched) {
        menuItem = matched.data;
        resolvedItemId = matched.id;
        issues.push({
          itemId,
          code: 'ID_UPDATED',
          message: 'Item was refreshed to match the latest menu',
          resolvedItemId,
        });
      }
    }

    if (!menuItem) {
      issues.push({
        itemId,
        code: 'NOT_FOUND',
        message: 'Item no longer on the menu',
      });
      continue;
    }

    if (menuItem.isAvailable === false || menuItem.isActive === false) {
      issues.push({
        itemId: resolvedItemId,
        code: 'UNAVAILABLE',
        message: 'Item is currently unavailable',
      });
      continue;
    }

    const livePrice = Number(menuItem.price ?? 0);
    if (line.unitPrice != null && Math.round(Number(line.unitPrice)) !== Math.round(livePrice)) {
      issues.push({
        itemId: resolvedItemId,
        code: 'PRICE_CHANGED',
        message: 'Price updated since you added this item',
      });
    }

    resolvedLines.push({
      itemId: resolvedItemId,
      quantity,
      unitPrice: livePrice,
      name: line.name ?? String(menuItem.name ?? 'Item'),
    });
  }

  const valid = issues.every((issue) => !isBlockingIssue(issue.code));

  if (resolvedLines.length === 0) {
    return { valid: false, quote: EMPTY_QUOTE, issues, resolvedLines };
  }

  const { quote } = await buildMarketplaceQuote(db, {
    ...request,
    restaurantId,
    lines: resolvedLines,
  });

  return { valid, quote, issues, resolvedLines };
}
