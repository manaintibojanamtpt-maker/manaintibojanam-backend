/**
 * Storefront domain — Firestore menu item projection (PX6.1A / Sprint 18).
 * Owner-authored fields only; no consumer formatting.
 */

export type StorefrontLabelKind =
  | 'BESTSELLER'
  | 'CHEF_PICK'
  | 'NEW'
  | 'LIMITED'
  | 'FESTIVAL'
  | 'HEALTHY'
  | 'KIDS'
  | 'POPULAR'
  | 'SPICY'
  | 'PROTEIN'
  | 'SEASONAL'
  | 'CUSTOM';

export interface StorefrontLabel {
  readonly kind: StorefrontLabelKind;
  readonly displayText: string;
}

export interface StorefrontOfferSnapshot {
  readonly offerId?: string;
  readonly enabled: boolean;
  readonly displayText: string;
  readonly badge?: string;
  readonly type?: string;
  readonly priority?: number;
}

export interface StorefrontVariantSnapshot {
  readonly variantId?: string;
  readonly kind: string;
  readonly displayName: string;
  readonly price: number;
  readonly offerPrice?: number;
  readonly isAvailable?: boolean;
  readonly sortOrder?: number;
}

export interface StorefrontAddonOptionSnapshot {
  readonly optionId?: string;
  readonly kind: string;
  readonly displayName: string;
  readonly price: number;
  readonly maxQuantity?: number;
  readonly sortOrder?: number;
}

export interface StorefrontAddonGroupSnapshot {
  readonly groupId?: string;
  readonly displayName: string;
  readonly options: readonly StorefrontAddonOptionSnapshot[];
  readonly required?: boolean;
  readonly minSelections?: number;
  readonly maxSelections?: number;
}

/** Firestore `menu` collection document — owner storefront projection */
export interface StorefrontMenuItemDocument {
  readonly tenantId: string;
  readonly name: string;
  readonly category: string;
  readonly categoryId?: string;
  readonly price: number;
  readonly type: 'veg' | 'non-veg';
  readonly description?: string;
  readonly image?: string;
  readonly isAvailable: boolean;
  readonly labels?: readonly StorefrontLabel[];
  readonly offer?: StorefrontOfferSnapshot;
  readonly variants?: readonly StorefrontVariantSnapshot[];
  readonly addonGroups?: readonly StorefrontAddonGroupSnapshot[];
  readonly spiceLevel?: string;
  readonly preparationMinutes?: number;
  readonly chefNote?: string;
  readonly ingredients?: readonly string[];
  readonly cookingStyle?: string;
  readonly servingSize?: string;
  readonly popularPairing?: string;
  readonly nutritionSummary?: string;
  readonly allergenSummary?: string;
  readonly createdAt?: unknown;
  readonly updatedAt?: unknown;
}

export function normalizeStorefrontLabels(
  raw: unknown,
): StorefrontLabel[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const labels: StorefrontLabel[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const kind = typeof (entry as { kind?: unknown }).kind === 'string'
      ? (entry as { kind: string }).kind
      : '';
    const displayText = typeof (entry as { displayText?: unknown }).displayText === 'string'
      ? (entry as { displayText: string }).displayText.trim()
      : '';
    if (!kind || !displayText) continue;
    labels.push({ kind: kind as StorefrontLabelKind, displayText });
  }
  return labels.length > 0 ? labels : undefined;
}

export function normalizeStorefrontOffer(
  raw: unknown,
): StorefrontOfferSnapshot | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const body = raw as Record<string, unknown>;
  const displayText = typeof body.displayText === 'string' ? body.displayText.trim() : '';
  if (!displayText) return undefined;
  return {
    offerId: typeof body.offerId === 'string' ? body.offerId : undefined,
    enabled: body.enabled !== false,
    displayText,
    badge: typeof body.badge === 'string' ? body.badge : undefined,
    type: typeof body.type === 'string' ? body.type : undefined,
    priority: typeof body.priority === 'number' ? body.priority : undefined,
  };
}
