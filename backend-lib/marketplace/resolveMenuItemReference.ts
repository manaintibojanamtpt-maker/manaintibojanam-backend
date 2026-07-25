import type { Firestore } from 'firebase-admin/firestore';
import { classifyTextMatch, normalizeForMatch } from '../shared/serverBundleHelpers.js';
import { canonicalizeFoodName, scoreFoodNameMatch } from './foodNameMatch.js';

/** Minimum signal to auto-resolve a fuzzy name match (prefix or exact). */
const MIN_RESOLVE_SIGNAL = 0.85;
/** Minimum signal to surface a candidate in clarification options. */
const MIN_CANDIDATE_SIGNAL = 0.65;
/** Required gap between top and second candidate to auto-resolve. */
const MIN_RESOLVE_GAP = 0.15;

export type MenuVariantRef = {
  readonly variantId: string;
  readonly label: string;
  readonly price?: number;
};

export type ResolvedMenuItemRef = {
  readonly restaurantId: string;
  readonly foodId: string;
  readonly itemId: string;
  readonly name: string;
  readonly unitPrice: number;
  readonly variantId?: string;
  readonly variantLabel?: string;
  readonly confidence: number;
  readonly matchType: 'id' | 'exact_name' | 'fuzzy_name';
};

export type MenuItemCandidateOption = {
  readonly foodId: string;
  readonly name: string;
  readonly unitPrice?: number;
  readonly variantId?: string;
  readonly variantLabel?: string;
};

export type ResolveMenuItemReferenceResult =
  | { readonly status: 'resolved'; readonly item: ResolvedMenuItemRef }
  | {
      readonly status: 'needs_clarification';
      readonly code: string;
      readonly questions: readonly string[];
      readonly candidates: readonly MenuItemCandidateOption[];
    }
  | {
      readonly status: 'not_found';
      readonly code: string;
      readonly questions: readonly string[];
    };

type MenuRow = {
  readonly id: string;
  readonly data: Record<string, unknown>;
  readonly name: string;
  readonly price: number;
  readonly variants: readonly MenuVariantRef[];
};

function isAvailable(data: Record<string, unknown>): boolean {
  return data.isAvailable !== false && data.isActive !== false;
}

function parseVariants(itemId: string, data: Record<string, unknown>): MenuVariantRef[] {
  const raw = data.variants;
  if (!Array.isArray(raw) || raw.length === 0) return [];

  return raw.map((entry, index) => {
    const obj =
      entry && typeof entry === 'object' && !Array.isArray(entry)
        ? (entry as Record<string, unknown>)
        : {};
    const label = String(obj.displayName ?? obj.name ?? obj.kind ?? `Option ${index + 1}`).trim();
    const variantId = String(obj.variantId ?? obj.id ?? `var_${itemId}_${index}`).trim();
    const absolute = obj.offerPrice ?? obj.price;
    return {
      variantId: variantId || `var_${itemId}_${index}`,
      label: label || `Option ${index + 1}`,
      ...(absolute != null && Number.isFinite(Number(absolute))
        ? { price: Number(absolute) }
        : {}),
    };
  });
}

function toMenuRows(menuById: Map<string, Record<string, unknown>>): MenuRow[] {
  const rows: MenuRow[] = [];
  for (const [id, data] of menuById) {
    if (!isAvailable(data)) continue;
    const name = String(data.name ?? '').trim();
    if (!name) continue;
    rows.push({
      id,
      data,
      name,
      price: Number(data.price ?? 0),
      variants: parseVariants(id, data),
    });
  }
  return rows;
}

function formatCandidateList(candidates: readonly MenuItemCandidateOption[]): string {
  return candidates
    .slice(0, 5)
    .map((c) => {
      const variant = c.variantLabel ? ` (${c.variantLabel})` : '';
      return `"${c.name}${variant}" [${c.foodId}]`;
    })
    .join(', ');
}

function resolveVariant(
  row: MenuRow,
  variantId?: string,
  variantLabel?: string,
):
  | { readonly status: 'resolved'; readonly variant?: MenuVariantRef }
  | {
      readonly status: 'needs_clarification';
      readonly questions: readonly string[];
      readonly candidates: readonly MenuItemCandidateOption[];
      readonly code: string;
    } {
  const variants = row.variants;
  if (variants.length === 0) {
    return { status: 'resolved' };
  }

  const idHint = variantId?.trim();
  if (idHint) {
    const match = variants.find((v) => v.variantId === idHint);
    if (!match) {
      return {
        status: 'needs_clarification',
        code: 'VARIANT_NOT_FOUND',
        questions: [
          `Which size/option for "${row.name}"? Options: ${formatCandidateList(
            variants.map((v) => ({
              foodId: row.id,
              name: row.name,
              variantId: v.variantId,
              variantLabel: v.label,
              ...(v.price != null ? { unitPrice: v.price } : { unitPrice: row.price }),
            })),
          )}`,
        ],
        candidates: variants.map((v) => ({
          foodId: row.id,
          name: row.name,
          variantId: v.variantId,
          variantLabel: v.label,
          unitPrice: v.price ?? row.price,
        })),
      };
    }
    return { status: 'resolved', variant: match };
  }

  const labelHint = variantLabel?.trim();
  if (labelHint) {
    const scored = variants
      .map((v) => ({
        variant: v,
        signal: classifyTextMatch(labelHint, v.label, 'variant').signal,
      }))
      .filter((entry) => entry.signal >= MIN_CANDIDATE_SIGNAL)
      .sort((a, b) => b.signal - a.signal);

    if (scored.length === 1 && scored[0]!.signal >= MIN_RESOLVE_SIGNAL) {
      return { status: 'resolved', variant: scored[0]!.variant };
    }

    if (
      scored.length >= 2 &&
      scored[0]!.signal >= MIN_RESOLVE_SIGNAL &&
      scored[0]!.signal - scored[1]!.signal >= MIN_RESOLVE_GAP
    ) {
      return { status: 'resolved', variant: scored[0]!.variant };
    }

    const options = (scored.length ? scored.map((s) => s.variant) : variants).map((v) => ({
      foodId: row.id,
      name: row.name,
      variantId: v.variantId,
      variantLabel: v.label,
      unitPrice: v.price ?? row.price,
    }));

    return {
      status: 'needs_clarification',
      code: 'AMBIGUOUS_VARIANT',
      questions: [
        `Which size/option for "${row.name}"? Options: ${formatCandidateList(options)}`,
      ],
      candidates: options,
    };
  }

  if (variants.length === 1) {
    return { status: 'resolved', variant: variants[0] };
  }

  const options = variants.map((v) => ({
    foodId: row.id,
    name: row.name,
    variantId: v.variantId,
    variantLabel: v.label,
    unitPrice: v.price ?? row.price,
  }));

  return {
    status: 'needs_clarification',
    code: 'VARIANT_REQUIRED',
    questions: [
      `"${row.name}" has multiple sizes/options. Which one? Options: ${formatCandidateList(options)}`,
    ],
    candidates: options,
  };
}

function buildResolved(
  restaurantId: string,
  row: MenuRow,
  matchType: ResolvedMenuItemRef['matchType'],
  confidence: number,
  variant?: MenuVariantRef,
): ResolvedMenuItemRef {
  return {
    restaurantId,
    foodId: row.id,
    itemId: row.id,
    name: row.name,
    unitPrice: variant?.price ?? row.price,
    confidence,
    matchType,
    ...(variant
      ? { variantId: variant.variantId, variantLabel: variant.label }
      : {}),
  };
}

/**
 * Resolve a menu item reference against an in-memory restaurant menu map.
 * Clarification-first: ambiguous or low-confidence matches never auto-pick.
 */
export function resolveMenuItemFromMenuMap(
  restaurantId: string,
  menuById: Map<string, Record<string, unknown>>,
  input: {
    readonly itemId?: string;
    readonly foodId?: string;
    readonly menuItemId?: string;
    readonly name?: string;
    readonly variantId?: string;
    readonly variantLabel?: string;
  },
): ResolveMenuItemReferenceResult {
  const rows = toMenuRows(menuById);
  const idHint =
    input.itemId?.trim() || input.foodId?.trim() || input.menuItemId?.trim() || '';

  if (idHint) {
    const data = menuById.get(idHint);
    if (!data || !isAvailable(data)) {
      return {
        status: 'not_found',
        code: 'NOT_FOUND',
        questions: [
          'That menu item is unavailable or no longer on this restaurant’s menu. Which item did you mean?',
        ],
      };
    }
    const row: MenuRow = {
      id: idHint,
      data,
      name: String(data.name ?? input.name ?? 'Item').trim() || 'Item',
      price: Number(data.price ?? 0),
      variants: parseVariants(idHint, data),
    };
    const variantResult = resolveVariant(row, input.variantId, input.variantLabel);
    if (variantResult.status === 'needs_clarification') {
      return {
        status: 'needs_clarification',
        code: variantResult.code,
        questions: variantResult.questions,
        candidates: variantResult.candidates,
      };
    }
    return {
      status: 'resolved',
      item: buildResolved(restaurantId, row, 'id', 1, variantResult.variant),
    };
  }

  const nameHint = input.name?.trim();
  if (!nameHint) {
    return {
      status: 'needs_clarification',
      code: 'MISSING_ITEM_REFERENCE',
      questions: ['Which menu item should this cart change apply to?'],
      candidates: [],
    };
  }

  const normalizedHint = normalizeForMatch(nameHint);
  const canonicalHint = canonicalizeFoodName(nameHint);
  const exactMatches = rows.filter((row) => {
    const rowNorm = normalizeForMatch(row.name);
    const rowCanon = canonicalizeFoodName(row.name);
    return rowNorm === normalizedHint || rowCanon === canonicalHint;
  });

  if (exactMatches.length === 1) {
    const row = exactMatches[0]!;
    const variantResult = resolveVariant(row, input.variantId, input.variantLabel);
    if (variantResult.status === 'needs_clarification') {
      return {
        status: 'needs_clarification',
        code: variantResult.code,
        questions: variantResult.questions,
        candidates: variantResult.candidates,
      };
    }
    return {
      status: 'resolved',
      item: buildResolved(restaurantId, row, 'exact_name', 1, variantResult.variant),
    };
  }

  if (exactMatches.length > 1) {
    const candidates = exactMatches.map((row) => ({
      foodId: row.id,
      name: row.name,
      unitPrice: row.price,
    }));
    return {
      status: 'needs_clarification',
      code: 'AMBIGUOUS_ITEM',
      questions: [
        `Which "${nameHint}" did you mean? Options: ${formatCandidateList(candidates)}`,
      ],
      candidates,
    };
  }

  const scored = rows
    .map((row) => {
      const signal = scoreFoodNameMatch(nameHint, row.name);
      const matchType = classifyTextMatch(nameHint, row.name, 'name').matchType;
      return { row, signal, matchType };
    })
    .filter((entry) => entry.signal >= MIN_CANDIDATE_SIGNAL)
    .sort((a, b) => b.signal - a.signal || a.row.name.localeCompare(b.row.name));

  if (scored.length === 0) {
    return {
      status: 'not_found',
      code: 'NOT_FOUND',
      questions: [
        `I couldn’t find "${nameHint}" on this restaurant’s menu. Which item should I use instead?`,
      ],
    };
  }

  const top = scored[0]!;
  const second = scored[1];
  const canAutoResolve =
    top.signal >= MIN_RESOLVE_SIGNAL &&
    (!second || top.signal - second.signal >= MIN_RESOLVE_GAP);

  if (canAutoResolve) {
    const variantResult = resolveVariant(top.row, input.variantId, input.variantLabel);
    if (variantResult.status === 'needs_clarification') {
      return {
        status: 'needs_clarification',
        code: variantResult.code,
        questions: variantResult.questions,
        candidates: variantResult.candidates,
      };
    }
    return {
      status: 'resolved',
      item: buildResolved(
        restaurantId,
        top.row,
        'fuzzy_name',
        top.signal,
        variantResult.variant,
      ),
    };
  }

  const candidates = scored.slice(0, 5).map((entry) => ({
    foodId: entry.row.id,
    name: entry.row.name,
    unitPrice: entry.row.price,
  }));

  return {
    status: 'needs_clarification',
    code: 'AMBIGUOUS_ITEM',
    questions: [
      `Which item did you mean by "${nameHint}"? Options: ${formatCandidateList(candidates)}`,
    ],
    candidates,
  };
}

type TenantRaw = Record<string, unknown>;

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

export async function loadRestaurantMenuMap(
  db: Firestore,
  restaurantId: string,
): Promise<{ readonly tenantId: string; readonly menuById: Map<string, Record<string, unknown>> } | null> {
  const loaded = await loadTenantByRestaurantId(db, restaurantId);
  if (!loaded) return null;

  const snapshot = await db.collection('menu').where('tenantId', '==', loaded.id).get();
  const menuById = new Map(snapshot.docs.map((doc) => [doc.id, doc.data() as Record<string, unknown>]));
  return { tenantId: loaded.id, menuById };
}

/**
 * Restaurant-scoped menu item resolution for incomplete AI cart plan payloads.
 * Never mutates cart state. Ambiguity always returns clarification, not a guess.
 */
export async function resolveMenuItemReference(
  db: Firestore,
  input: {
    readonly restaurantId: string;
    readonly itemId?: string;
    readonly foodId?: string;
    readonly menuItemId?: string;
    readonly name?: string;
    readonly variantId?: string;
    readonly variantLabel?: string;
  },
): Promise<ResolveMenuItemReferenceResult> {
  const restaurantId = input.restaurantId.trim();
  if (!restaurantId) {
    return {
      status: 'needs_clarification',
      code: 'MISSING_RESTAURANT',
      questions: ['Which restaurant should this cart change apply to?'],
      candidates: [],
    };
  }

  const loaded = await loadRestaurantMenuMap(db, restaurantId);
  if (!loaded) {
    return {
      status: 'not_found',
      code: 'RESTAURANT_NOT_FOUND',
      questions: ['I couldn’t find that restaurant. Which restaurant are you ordering from?'],
    };
  }

  return resolveMenuItemFromMenuMap(loaded.tenantId, loaded.menuById, input);
}
