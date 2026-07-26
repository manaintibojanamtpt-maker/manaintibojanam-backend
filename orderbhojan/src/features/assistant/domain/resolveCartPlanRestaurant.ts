import { getCachedMenuItemsForSearch } from '@/features/search/store/searchMenuCacheStore';
import type { CartPlanAction } from './cartPlanContract';

const FOOD_TOKEN_ALIASES: Readonly<Record<string, string>> = {
  idly: 'idli',
  idlis: 'idli',
  vada: 'wada',
  vadai: 'wada',
  malasa: 'masala',
  dosai: 'dosa',
  biriyani: 'biryani',
  briyani: 'biryani',
  inti: 'inti',
  intibojanam: 'inti bhojanam',
};

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalize(value: string): string {
  return normalize(value)
    .split(' ')
    .map((t) => FOOD_TOKEN_ALIASES[t] ?? t)
    .join(' ');
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array<number>(a.length + 1);
  const curr = new Array<number>(a.length + 1);
  for (let i = 0; i <= a.length; i += 1) prev[i] = i;
  for (let j = 1; j <= b.length; j += 1) {
    curr[0] = j;
    for (let i = 1; i <= a.length; i += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[i] = Math.min(curr[i - 1]! + 1, prev[i]! + 1, prev[i - 1]! + cost);
    }
    for (let i = 0; i <= a.length; i += 1) prev[i] = curr[i]!;
  }
  return prev[a.length]!;
}

function scoreNames(query: string, candidate: string): number {
  const q = canonicalize(query);
  const c = canonicalize(candidate);
  if (!q || !c) return 0;
  if (q === c) return 1;
  if (c.includes(q) || q.includes(c)) return 0.86;

  const qTokens = q.split(' ').filter(Boolean);
  const cTokens = c.split(' ').filter(Boolean);
  let tokenHits = 0;
  for (const qt of qTokens) {
    const hit = cTokens.some((ct) => {
      if (ct === qt || ct.includes(qt) || qt.includes(ct)) return true;
      return levenshtein(qt, ct) <= 1 && Math.max(qt.length, ct.length) >= 4;
    });
    if (hit) tokenHits += 1;
  }
  if (qTokens.length > 0 && tokenHits === qTokens.length) {
    return qTokens.length === 1 ? 0.9 : 0.88;
  }

  const compactQ = q.replace(/\s/g, '');
  const compactC = c.replace(/\s/g, '');
  const dist = levenshtein(compactQ, compactC);
  if (dist <= 2 && Math.max(compactQ.length, compactC.length) <= 36) {
    return 1 - dist / Math.max(4, Math.max(compactQ.length, compactC.length));
  }
  return 0;
}

export type NearbyKitchenHint = {
  readonly id: string;
  readonly name: string;
};

function resolveKitchenFromText(
  haystackRaw: string,
  kitchens: readonly NearbyKitchenHint[],
): string | null {
  const haystack = normalize(haystackRaw);
  if (!haystack || kitchens.length === 0) return null;

  let best: { id: string; score: number; nameLen: number } | null = null;
  for (const kitchen of kitchens) {
    const id = kitchen.id?.trim();
    if (!id) continue;
    const name = normalize(kitchen.name);
    if (!name) continue;
    let score = scoreNames(haystack, kitchen.name);
    const compactHay = haystack.replace(/\s/g, '');
    const compactName = name.replace(/\s/g, '');
    if (compactName.length >= 6 && compactHay.includes(compactName)) {
      score = Math.max(score, 0.97);
    } else if (compactHay.includes(compactName) || (compactHay.length >= 6 && compactName.includes(compactHay))) {
      score = Math.max(score, 0.93);
    }
    const firstToken = name.split(' ')[0] ?? '';
    if (firstToken.length >= 4 && compactHay.includes(firstToken)) {
      score = Math.max(score, 0.84);
    }
    if (score < 0.78) continue;
    if (!best || score > best.score || (score === best.score && name.length > best.nameLen)) {
      best = { id, score, nameLen: name.length };
    }
  }
  return best?.id ?? null;
}

/**
 * Pick the restaurant a cart plan should validate against.
 * Priority: explicit plan restaurantId → kitchen named in utterance → foodId owner →
 * unique dish owner → active kitchen.
 *
 * Named kitchen beats foodId owner so a stale id from another menu cannot hijack validate.
 */
export function resolveCartPlanRestaurantId(input: {
  readonly plan: CartPlanAction | null | undefined;
  readonly userMessage?: string | null;
  readonly assistantMessage?: string | null;
  readonly nearbyKitchens?: readonly NearbyKitchenHint[];
  readonly activeRestaurantId?: string | null;
}): string | null {
  const payload = input.plan?.payload ?? {};
  const fromPayload =
    (typeof payload.restaurantId === 'string' && payload.restaurantId.trim()) ||
    (typeof payload.restaurant_id === 'string' && payload.restaurant_id.trim()) ||
    '';
  if (fromPayload) return fromPayload;

  const kitchens = input.nearbyKitchens ?? [];
  const utteranceKitchen = resolveKitchenFromText(
    [input.userMessage ?? '', input.assistantMessage ?? ''].filter(Boolean).join(' '),
    kitchens,
  );
  if (utteranceKitchen) return utteranceKitchen;

  const foodId =
    (typeof payload.foodId === 'string' && payload.foodId.trim()) ||
    (typeof payload.itemId === 'string' && payload.itemId.trim()) ||
    '';
  if (foodId) {
    const owner = getCachedMenuItemsForSearch().find((item) => item.id === foodId);
    const ownerId = owner?.restaurant?.restaurantId?.trim();
    if (ownerId) return ownerId;
  }

  // Name-match dish against all cached menus — if unique kitchen owns the best hit, use it.
  const dishName = typeof payload.name === 'string' ? payload.name.trim() : '';
  if (dishName) {
    const scored = getCachedMenuItemsForSearch()
      .filter((item) => item.type === 'food' && item.restaurant?.restaurantId)
      .map((item) => ({
        restaurantId: item.restaurant!.restaurantId,
        score: scoreNames(dishName, item.label),
      }))
      .filter((e) => e.score >= 0.88)
      .sort((a, b) => b.score - a.score);
    const top = scored[0];
    if (top) {
      const topKitchenHits = scored.filter((e) => e.score >= top.score - 0.05);
      const uniqueKitchens = new Set(topKitchenHits.map((e) => e.restaurantId));
      if (uniqueKitchens.size === 1) return top.restaurantId;
    }
  }

  return input.activeRestaurantId?.trim() || null;
}

export function scoreFoodName(query: string, candidate: string): number {
  return scoreNames(query, candidate);
}
