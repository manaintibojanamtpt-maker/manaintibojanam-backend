/**
 * Enriched cart-add validation used by the OB voice adapter (Phase 1.3).
 * Mirrors the send() cart-add pipeline: enrich → resolve kitchen → prefetch → validate.
 * Does not mutate cart.
 */
import type { CartPlanAction, CartPlanValidationResult } from '@/features/assistant/domain/cartPlanContract';
import { enrichCartPlansFromMenuCache, matchKitchenFragmentInMessage } from '@/features/assistant/domain/matchOrderingVocabulary';
import { resolveCartPlanRestaurantId } from '@/features/assistant/domain/resolveCartPlanRestaurant';
import { toPendingPlanRestaurantRef } from '@/features/assistant/domain/restaurantIdSlug';
import { prefetchKitchenMenuForAssist } from '@/features/assistant/application/prefetchKitchenMenuForAssist';

export type NearbyKitchenHint = { readonly id: string; readonly name: string };

export type EnrichedCartAddInput = {
  readonly itemName: string;
  readonly quantity: number;
  readonly kitchenHint?: string;
};

export type EnrichedCartAddValidateDeps = {
  readonly validate: (request: {
    readonly restaurantId: string;
    readonly proposedActions: readonly CartPlanAction[];
    readonly conversationId?: string;
  }) => Promise<CartPlanValidationResult>;
  readonly getActiveRestaurant: () => {
    readonly restaurantId: string | null;
    readonly restaurantSlug: string | null;
  };
  readonly getCoords: () => { readonly lat?: number; readonly lng?: number } | null;
  readonly getNearbyKitchens: () => readonly NearbyKitchenHint[];
  readonly conversationId?: string;
  readonly prefetch?: typeof prefetchKitchenMenuForAssist;
};

export type EnrichedCartAddResult =
  | {
      readonly ok: true;
      readonly validation: CartPlanValidationResult;
      readonly restaurant: { readonly restaurantId: string; readonly restaurantSlug: string };
      readonly proposedActions: readonly CartPlanAction[];
    }
  | {
      readonly ok: false;
      readonly code: 'NEEDS_KITCHEN' | 'INVALID_ARGS';
      readonly message: string;
    };

export async function validateEnrichedCartAdd(
  input: EnrichedCartAddInput,
  deps: EnrichedCartAddValidateDeps,
): Promise<EnrichedCartAddResult> {
  const itemName = input.itemName.trim();
  const quantity = input.quantity;
  if (!itemName || !Number.isFinite(quantity) || quantity <= 0) {
    return {
      ok: false,
      code: 'INVALID_ARGS',
      message: 'Tell me a dish name and quantity to add.',
    };
  }

  const active = deps.getActiveRestaurant();
  const nearby = deps.getNearbyKitchens();
  const kitchenFromHint = input.kitchenHint
    ? matchKitchenFragmentInMessage(input.kitchenHint, nearby)
    : null;
  const kitchenHintMsg = input.kitchenHint
    ? `${itemName} from ${input.kitchenHint}`
    : itemName;

  const draftPlan: CartPlanAction = {
    type: 'cart_add_plan',
    requiresConfirmation: true,
    executable: false,
    payload: {
      name: itemName,
      quantity,
      ...(kitchenFromHint?.id
        ? { restaurantId: kitchenFromHint.id }
        : active.restaurantId
          ? { restaurantId: active.restaurantId }
          : {}),
    },
    reason: 'voice_core_cart_add',
  };

  const cartActions = enrichCartPlansFromMenuCache([draftPlan], {
    activeRestaurantId: kitchenFromHint?.id ?? active.restaurantId,
    userMessage: kitchenHintMsg,
    nearbyKitchens: nearby,
  });

  const planRestaurantId = resolveCartPlanRestaurantId({
    plan: cartActions[0],
    userMessage: kitchenHintMsg,
    nearbyKitchens: nearby,
    activeRestaurantId: kitchenFromHint?.id ?? active.restaurantId,
  });

  if (!planRestaurantId) {
    return {
      ok: false,
      code: 'NEEDS_KITCHEN',
      message: input.kitchenHint
        ? `I couldn’t resolve ${input.kitchenHint} yet. Open that kitchen, then ask again.`
        : `To add ${quantity}× ${itemName}, open a kitchen menu first (or name the kitchen).`,
    };
  }

  const restaurant = toPendingPlanRestaurantRef({
    planRestaurantId,
    activeRestaurantId: active.restaurantId,
    activeRestaurantSlug: active.restaurantSlug,
  });

  const coords = deps.getCoords();
  const prefetch = deps.prefetch ?? prefetchKitchenMenuForAssist;
  await prefetch({
    restaurantId: planRestaurantId,
    restaurantSlug: restaurant.restaurantSlug,
    lat: coords?.lat,
    lng: coords?.lng,
  });

  const validation = await deps.validate({
    restaurantId: planRestaurantId,
    proposedActions: cartActions,
    ...(deps.conversationId ? { conversationId: deps.conversationId } : {}),
  });

  return {
    ok: true,
    validation,
    restaurant,
    proposedActions: cartActions,
  };
}

/** Readiness gate: enriched validate + restaurant-context confirm deps are wired. */
export function isVoiceCoreConfirmAddReady(deps: {
  readonly hasEnrichedValidate: boolean;
  readonly hasRestaurantContextEnsure: boolean;
}): boolean {
  return deps.hasEnrichedValidate && deps.hasRestaurantContextEnsure;
}
