import { getCachedMenuItemsForSearch } from '@/features/search/store/searchMenuCacheStore';
import type { CartPlanAction } from './cartPlanContract';
import type { OrderingAssistContextPayload } from './buildOrderingAssistContext';

const FOOD_TOKEN_ALIASES: Readonly<Record<string, string>> = {
  idly: 'idli',
  idlis: 'idli',
  vada: 'wada',
  vadai: 'wada',
  malasa: 'masala',
  dosai: 'dosa',
  biriyani: 'biryani',
  briyani: 'biryani',
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
  if (c.includes(q) || q.includes(c)) return 0.85;

  const qTokens = q.split(' ').filter(Boolean);
  const cTokens = c.split(' ').filter(Boolean);
  let tokenHits = 0;
  for (const qt of qTokens) {
    const hit = cTokens.some((ct) => {
      if (ct === qt || ct.includes(qt) || qt.includes(ct)) return true;
      return levenshtein(qt, ct) <= 1 && Math.max(qt.length, ct.length) >= 5;
    });
    if (hit) tokenHits += 1;
  }
  if (qTokens.length > 0 && tokenHits === qTokens.length) {
    return qTokens.length === 1 ? 0.9 : 0.88;
  }

  const compactQ = q.replace(/\s/g, '');
  const compactC = c.replace(/\s/g, '');
  const dist = levenshtein(compactQ, compactC);
  if (dist <= 2 && Math.max(compactQ.length, compactC.length) <= 28) {
    return 1 - dist / Math.max(4, Math.max(compactQ.length, compactC.length));
  }
  return 0;
}

export function matchKitchenFragmentInMessage(
  message: string,
  kitchens: readonly { readonly id?: string; readonly name: string }[],
): { readonly id?: string; readonly name: string } | null {
  const text = normalize(message);
  if (!text || text.length < 3 || kitchens.length === 0) return null;

  // Prefer longer kitchen names so "Inti Bhojanam" beats a short fragment hit.
  const ranked = [...kitchens]
    .map((k) => ({ kitchen: k, score: scoreNames(text, k.name) }))
    .filter((e) => e.score >= 0.72 || normalize(e.kitchen.name).includes(text) || text.includes(normalize(e.kitchen.name).split(' ').pop() ?? ''))
    .sort((a, b) => b.score - a.score || b.kitchen.name.length - a.kitchen.name.length);

  // Kitchen-only: message is mostly the kitchen name (no clear dish add intent).
  const top = ranked[0];
  if (!top) return null;
  const kitchenNorm = normalize(top.kitchen.name);
  const looksLikeKitchenOnly =
    text.length <= kitchenNorm.length + 4 ||
    scoreNames(text, top.kitchen.name) >= 0.8 ||
    kitchenNorm.split(' ').some((part) => part.length >= 5 && text === part);
  if (!looksLikeKitchenOnly) return null;
  return top.kitchen;
}

export function enrichCartPlansFromMenuCache(
  plans: readonly CartPlanAction[],
  restaurantId?: string | null,
): readonly CartPlanAction[] {
  const cached = getCachedMenuItemsForSearch();
  const menu = restaurantId
    ? cached.filter((item) => item.restaurant?.restaurantId === restaurantId)
    : cached;

  return plans.map((plan) => {
    if (plan.type !== 'cart_add_plan') return plan;
    const payload = { ...(plan.payload ?? {}) };
    const existingId =
      (typeof payload.foodId === 'string' && payload.foodId.trim()) ||
      (typeof payload.itemId === 'string' && payload.itemId.trim()) ||
      '';
    if (existingId) return plan;
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    if (!name || menu.length === 0) return plan;

    const scored = menu
      .map((item) => ({ item, score: scoreNames(name, item.label) }))
      .filter((e) => e.score >= 0.8)
      .sort((a, b) => b.score - a.score);

    const top = scored[0];
    const second = scored[1];
    if (!top) return plan;
    if (second && top.score - second.score < 0.08) return plan;

    return {
      ...plan,
      payload: {
        ...payload,
        foodId: top.item.id,
        itemId: top.item.id,
        name: top.item.label,
        ...(typeof top.item.meta?.price === 'number' ? { unitPrice: top.item.meta.price } : {}),
        ...(restaurantId ? { restaurantId } : {}),
      },
    };
  });
}

/**
 * Correct a voice/ASR transcript using live kitchen + menu vocabulary.
 * Helps with Idly→Idli, Vada→Wada, and near-miss dish names.
 */
export function correctTranscriptAgainstOrderingVocab(
  transcript: string,
  context: OrderingAssistContextPayload | null,
): string {
  const text = transcript.trim();
  if (!text) return text;

  const vocab: string[] = [];
  for (const item of context?.menuItems ?? []) vocab.push(item.name);
  for (const kitchen of context?.nearbyKitchens ?? []) vocab.push(kitchen.name);
  for (const item of getCachedMenuItemsForSearch()) {
    if (item.type === 'food') vocab.push(item.label);
  }
  if (vocab.length === 0) return text;

  const words = text.split(/\s+/);
  const corrected = words.map((word) => {
    const scrubbed = word.replace(/[^\w']/g, '');
    if (scrubbed.length < 3) return word;
    let best: { name: string; score: number } | null = null;
    for (const name of vocab) {
      for (const token of name.split(/\s+/)) {
        const score = scoreNames(scrubbed, token);
        if (score >= 0.86 && (!best || score > best.score)) {
          best = { name: token, score };
        }
      }
      const full = scoreNames(scrubbed, name);
      if (full >= 0.9 && (!best || full > best.score)) {
        best = { name, score: full };
      }
    }
    if (!best) return word;
    // Preserve surrounding punctuation on the original word.
    return word.replace(scrubbed, best.name);
  });

  // Also try replacing multi-word phrases (e.g. "medu vada") with menu names.
  let joined = corrected.join(' ');
  const rankedMenu = [...(context?.menuItems ?? [])]
    .map((item) => ({ name: item.name, score: scoreNames(joined, item.name) }))
    .filter((e) => e.score >= 0.88)
    .sort((a, b) => b.score - a.score);
  if (rankedMenu[0] && rankedMenu[0].score >= 0.92) {
    // If transcript is basically just the dish (plus fillers), prefer exact menu spelling.
    const fillers = /^(please\s+|add\s+|i\s+want\s+|get\s+me\s+)?/i;
    const core = joined.replace(fillers, '').replace(/\s+to\s+cart$/i, '').trim();
    if (scoreNames(core, rankedMenu[0].name) >= 0.9) {
      joined = joined.replace(new RegExp(core.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), rankedMenu[0].name);
    }
  }

  return joined;
}
