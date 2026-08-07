import { getCachedMenuItemsForSearch } from '@/features/search/store/searchMenuCacheStore';
import type { CartPlanAction } from './cartPlanContract';
import type { OrderingAssistContextPayload } from './buildOrderingAssistContext';
import {
  resolveCartPlanRestaurantId,
  scoreFoodName,
  type NearbyKitchenHint,
} from './resolveCartPlanRestaurant';
import { normalizeOrderingText } from './orderingTextNormalize';
import { normalizeKitchenAsr, scoreKitchenHint } from './kitchenAsrNormalize';

function normalize(value: string): string {
  return normalizeOrderingText(value);
}

function scoreNames(query: string, candidate: string): number {
  return scoreFoodName(query, candidate);
}

export function matchKitchenFragmentInMessage(
  message: string,
  kitchens: readonly { readonly id?: string; readonly name: string }[],
): { readonly id?: string; readonly name: string } | null {
  const text = normalizeKitchenAsr(normalize(message));
  if (!text || text.length < 3 || kitchens.length === 0) return null;

  const ranked = [...kitchens]
    .map((k) => {
      const name = normalize(k.name);
      const compactText = text.replace(/\s/g, '');
      const compactName = name.replace(/\s/g, '');
      let score = Math.max(scoreNames(text, k.name), scoreKitchenHint(text, k.name));
      if (compactText.includes(compactName) || compactName.includes(compactText)) {
        score = Math.max(score, 0.95);
      }
      const first = name.split(' ')[0] ?? '';
      if (first.length >= 4 && (text.includes(first) || compactText.includes(first))) {
        score = Math.max(score, 0.84);
      }
      if (/mana/i.test(name) && /\b(mana|money|mony|many|mani)\b/i.test(text)) {
        score = Math.max(score, 0.9);
      }
      return { kitchen: k, score };
    })
    .filter((e) => e.score >= 0.78)
    .sort((a, b) => b.score - a.score || b.kitchen.name.length - a.kitchen.name.length);

  const top = ranked[0];
  if (!top) return null;
  return top.kitchen;
}

export type EnrichCartPlansOptions = {
  readonly activeRestaurantId?: string | null;
  readonly userMessage?: string | null;
  readonly assistantMessage?: string | null;
  readonly nearbyKitchens?: readonly NearbyKitchenHint[];
};

/**
 * Bind cart_add_plan foodId/name to the correct kitchen menu before validate.
 * Never trusts a foodId from a different restaurant than the plan target.
 */
export function enrichCartPlansFromMenuCache(
  plans: readonly CartPlanAction[],
  restaurantIdOrOptions?: string | null | EnrichCartPlansOptions,
): readonly CartPlanAction[] {
  const options: EnrichCartPlansOptions =
    typeof restaurantIdOrOptions === 'string' || restaurantIdOrOptions == null
      ? { activeRestaurantId: restaurantIdOrOptions }
      : restaurantIdOrOptions;

  const cached = getCachedMenuItemsForSearch();

  return plans.map((plan) => {
    if (plan.type !== 'cart_add_plan' && plan.type !== 'cart_update_plan') return plan;

    const targetRestaurantId = resolveCartPlanRestaurantId({
      plan,
      userMessage: options.userMessage,
      assistantMessage: options.assistantMessage,
      nearbyKitchens: options.nearbyKitchens,
      activeRestaurantId: options.activeRestaurantId,
    });

    const menu = targetRestaurantId
      ? cached.filter(
          (item) => item.type === 'food' && item.restaurant?.restaurantId === targetRestaurantId,
        )
      : cached.filter((item) => item.type === 'food');

    const payload = { ...(plan.payload ?? {}) };
    const existingId =
      (typeof payload.foodId === 'string' && payload.foodId.trim()) ||
      (typeof payload.itemId === 'string' && payload.itemId.trim()) ||
      '';

    const idBelongsToTarget =
      !!existingId &&
      menu.some((item) => item.id === existingId);

    if (existingId && idBelongsToTarget) {
      // Keep valid id; still stamp restaurantId so validate uses the right kitchen.
      if (targetRestaurantId && payload.restaurantId !== targetRestaurantId) {
        return {
          ...plan,
          payload: { ...payload, restaurantId: targetRestaurantId },
        };
      }
      return plan;
    }

    // Drop stale foodId from another kitchen — rematch by name on target menu.
    if (existingId && !idBelongsToTarget) {
      delete payload.foodId;
      delete payload.itemId;
      delete payload.menuItemId;
    }

    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    if (!name || menu.length === 0) {
      // Target kitchen menu empty / miss — try any cached kitchen that owns this dish.
      if (name) {
        const cross = findBestDishAcrossMenus(name, cached);
        if (cross) {
          return {
            ...plan,
            payload: {
              ...payload,
              foodId: cross.item.id,
              itemId: cross.item.id,
              name: cross.item.label,
              restaurantId: cross.restaurantId,
              ...(typeof cross.item.meta?.price === 'number'
                ? { unitPrice: cross.item.meta.price }
                : {}),
            },
          };
        }
      }
      if (targetRestaurantId) {
        return {
          ...plan,
          payload: { ...payload, restaurantId: targetRestaurantId },
        };
      }
      return plan;
    }

    const scored = menu
      .map((item) => ({ item, score: scoreNames(name, item.label) }))
      .filter((e) => e.score >= 0.78)
      .sort((a, b) => b.score - a.score);

    const top = scored[0];
    const second = scored[1];
    if (!top) {
      const cross = findBestDishAcrossMenus(name, cached);
      if (cross) {
        return {
          ...plan,
          payload: {
            ...payload,
            foodId: cross.item.id,
            itemId: cross.item.id,
            name: cross.item.label,
            restaurantId: cross.restaurantId,
            ...(typeof cross.item.meta?.price === 'number'
              ? { unitPrice: cross.item.meta.price }
              : {}),
          },
        };
      }
      if (targetRestaurantId) {
        return {
          ...plan,
          payload: { ...payload, restaurantId: targetRestaurantId },
        };
      }
      return plan;
    }
    if (second && top.score - second.score < 0.06 && top.score < 0.95) {
      // Ambiguous — keep name + restaurant so validate can clarify, without wrong foodId.
      return {
        ...plan,
        payload: {
          ...payload,
          ...(targetRestaurantId ? { restaurantId: targetRestaurantId } : {}),
        },
      };
    }

    return {
      ...plan,
      payload: {
        ...payload,
        foodId: top.item.id,
        itemId: top.item.id,
        name: top.item.label,
        ...(typeof top.item.meta?.price === 'number' ? { unitPrice: top.item.meta.price } : {}),
        ...(targetRestaurantId ? { restaurantId: targetRestaurantId } : {}),
      },
    };
  });
}

function findBestDishAcrossMenus(
  dishName: string,
  cached: readonly {
    readonly id: string;
    readonly type: string;
    readonly label: string;
    readonly meta?: Record<string, unknown>;
    readonly restaurant?: { readonly restaurantId?: string };
  }[],
): { readonly item: { readonly id: string; readonly label: string; readonly meta?: Record<string, unknown> }; readonly restaurantId: string } | null {
  const scored = cached
    .filter((item) => item.type === 'food' && item.restaurant?.restaurantId)
    .map((item) => ({ item, score: scoreNames(dishName, item.label) }))
    .filter((entry) => entry.score >= 0.78)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;
  const top = scored[0]!;
  const bestTopScore = top.score;
  const topRestaurants = new Set(
    scored
      .filter((entry) => entry.score >= bestTopScore - 0.05)
      .map((entry) => entry.item.restaurant!.restaurantId!),
  );
  if (topRestaurants.size !== 1) return null;

  return {
    item: top.item,
    restaurantId: top.item.restaurant!.restaurantId!,
  };
}

/**
 * Correct a voice/ASR transcript using live kitchen + menu vocabulary.
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
    return word.replace(scrubbed, best.name);
  });

  let joined = corrected.join(' ');
  const rankedMenu = [...(context?.menuItems ?? [])]
    .map((item) => ({ name: item.name, score: scoreNames(joined, item.name) }))
    .filter((e) => e.score >= 0.88)
    .sort((a, b) => b.score - a.score);
  if (rankedMenu[0] && rankedMenu[0].score >= 0.92) {
    const fillers = /^(please\s+|add\s+|i\s+want\s+|get\s+me\s+)?/i;
    const core = joined.replace(fillers, '').replace(/\s+to\s+cart$/i, '').trim();
    if (scoreNames(core, rankedMenu[0].name) >= 0.9) {
      joined = joined.replace(
        new RegExp(core.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
        rankedMenu[0].name,
      );
    }
  }

  return joined;
}

export { normalize, scoreNames };
