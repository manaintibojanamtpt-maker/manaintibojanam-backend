import type { FoodPublic } from '@/types/marketplace-food';
import type { CartAppetiteContext } from './cartAppetiteContext';

export type CartAppetitePick = {
  readonly food: FoodPublic;
  readonly score: number;
  readonly badge: string;
  readonly reason: 'pairs' | 'climate' | 'moment' | 'popular';
};

function haystack(food: FoodPublic): string {
  return [food.name, food.description ?? '', food.category, food.popularPairing ?? '', ...(food.dietaryLabels ?? [])]
    .join(' ')
    .toLowerCase();
}

function keywordHits(text: string, keywords: readonly string[]): number {
  let hits = 0;
  for (const keyword of keywords) {
    if (text.includes(keyword.toLowerCase())) hits += 1;
  }
  return hits;
}

/**
 * Rank menu items for cart upsell — prefer complements / climate / time over random mains.
 */
export function scoreCartAppetiteItems(input: {
  readonly menuItems: readonly FoodPublic[];
  readonly cartFoodIds: ReadonlySet<string>;
  readonly cartNames: readonly string[];
  readonly context: CartAppetiteContext;
  readonly limit?: number;
}): readonly CartAppetitePick[] {
  const limit = input.limit ?? 6;
  const cartText = input.cartNames.join(' ').toLowerCase();

  const scored: CartAppetitePick[] = [];

  for (const food of input.menuItems) {
    if (food.availability === false) continue;
    if (input.cartFoodIds.has(food.foodId)) continue;
    // Skip obvious duplicate of what's already in cart (same name).
    if (input.cartNames.some((n) => n.toLowerCase() === food.name.toLowerCase())) continue;

    const text = haystack(food);
    let score = 0;
    let reason: CartAppetitePick['reason'] = 'moment';
    let badge = 'For you';

    const pairHits = keywordHits(text, input.context.pairingKeywords);
    if (pairHits > 0) {
      score += 40 + pairHits * 8;
      reason = 'pairs';
      badge = 'Pairs well';
    }

    const climateHits = keywordHits(text, input.context.appetiteKeywords.slice(0, 12));
    if (climateHits > 0) {
      score += 18 + climateHits * 4;
      if (reason !== 'pairs') {
        reason = 'climate';
        badge =
          input.context.season === 'summer'
            ? 'Cool down'
            : input.context.season === 'monsoon'
              ? 'Monsoon pick'
              : input.context.season === 'winter'
                ? 'Warm up'
                : 'Seasonal';
      }
    }

    if (food.recommended || food.chefSpecial) {
      score += 12;
      if (score < 40) {
        reason = 'popular';
        badge = 'Chef pick';
      }
    }
    if (food.bestSeller) {
      score += 10;
      if (reason === 'moment') {
        reason = 'popular';
        badge = 'Most loved';
      }
    }

    // Prefer lighter / cheaper add-ons for impulse (classic upsell).
    const price = food.offerPrice ?? food.price;
    if (price > 0 && price <= 149) score += 8;
    else if (price <= 199) score += 4;
    else if (price >= 350) score -= 6;

    // Soft boost when popularPairing mentions something already in cart.
    if (food.popularPairing && cartText && food.popularPairing.toLowerCase().split(/\s+/).some((w) => cartText.includes(w) && w.length > 3)) {
      score += 15;
      reason = 'pairs';
      badge = 'Pairs well';
    }

    // Avoid recommending another heavy main when cart already has a main.
    if (/biryani|thali|meal|pizza/i.test(cartText) && /biryani|thali|meal|pizza/i.test(food.name) && pairHits === 0) {
      score -= 20;
    }

    if (score <= 0) continue;
    scored.push({ food, score, badge, reason });
  }

  scored.sort((a, b) => b.score - a.score || a.food.price - b.food.price);
  return scored.slice(0, limit);
}
