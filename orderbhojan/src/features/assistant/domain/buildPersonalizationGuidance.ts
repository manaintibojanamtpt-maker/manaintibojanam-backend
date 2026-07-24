import type { ConsumerAssistHint } from '../types';
import type { PersonalizationBootstrap } from './personalizationBootstrap.types';
import type { PersonalizationIntent } from './isPersonalizationUserMessage';

export interface PersonalizationGuidance {
  readonly reply: string;
  readonly hints: readonly ConsumerAssistHint[];
  readonly systemNote?: string;
}

/**
 * Favorites / missing-data guidance — navigate only; never invent menu items.
 */
export function buildPersonalizationGuidance(params: {
  readonly intent: PersonalizationIntent;
  readonly bootstrap?: PersonalizationBootstrap;
}): PersonalizationGuidance | null {
  const { intent, bootstrap } = params;
  if (intent === 'none') return null;

  if (intent === 'favorite_restaurants') {
    const favorites = bootstrap?.favoriteRestaurants ?? [];
    if (favorites.length === 0) {
      return {
        reply:
          'I don’t see saved kitchens yet. Open Favorites after you heart a restaurant, or browse and save one first.',
        hints: [
          { type: 'navigate', target: '/favorites' },
          { type: 'navigate', target: '/' },
        ],
        systemNote: 'Favorites are restaurant-level only — dish usuals come from past orders when available.',
      };
    }

    const top = favorites.slice(0, 3);
    const names = top.map((f) => f.displayName).join(', ');
    return {
      reply: `Your saved kitchens include ${names}. Open one to rebuild a usual order from tracking or the menu — I’ll only propose cart plans after items are known.`,
      hints: [
        { type: 'navigate', target: '/favorites' },
        ...top.map((f) => ({
          type: 'navigate' as const,
          target: `/restaurant/${f.slug}/menu`,
        })),
      ],
    };
  }

  // Reorder / usual without item payload
  const recent = bootstrap?.recentOrders?.[0];
  const hints: ConsumerAssistHint[] = [{ type: 'navigate', target: '/orders' }];
  if (recent?.orderId) {
    hints.unshift({ type: 'navigate', target: `/orders/${recent.orderId}/track` });
  }

  return {
    reply:
      intent === 'usual_at_restaurant'
        ? 'I can rebuild your usual only from a real past order for this kitchen. Open tracking for a recent order so I can propose a reviewable cart plan.'
        : 'I can propose a reorder cart plan from a past order’s items. Open My Orders or tracking for that order, then ask again — nothing is added until you confirm.',
    hints,
    systemNote:
      'Personalization never invents items. Availability and substitutions are checked when a plan is validated.',
  };
}
