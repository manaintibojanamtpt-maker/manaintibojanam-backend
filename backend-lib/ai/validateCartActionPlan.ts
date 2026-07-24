import type { Firestore } from 'firebase-admin/firestore';
import {
  validateMarketplaceCart,
  type CartValidationIssue,
} from '../marketplace/projectCartValidation.js';
import type { MarketplaceQuoteLine } from '../marketplace/projectCheckout.js';
import {
  loadRestaurantMenuMap,
  resolveMenuItemFromMenuMap,
  type ResolvedMenuItemRef,
} from '../marketplace/resolveMenuItemReference.js';
import {
  type CartPlanPayload,
  type NormalizedCartPlan,
  type ParsedCartPlanRequest,
  hasItemReference,
  hasUnresolvedModifiers,
} from './cartActionPlan.js';

export const AI_CART_PLAN_VALIDATE_SCHEMA_VERSION = '5.0' as const;

export type CartPlanValidateStatus = 'validated' | 'needs_clarification' | 'invalid';

export interface CartPlanValidationIssue {
  readonly planType: NormalizedCartPlan['type'];
  readonly code: string;
  readonly message: string;
  readonly itemId?: string;
}

export interface ValidatedCartPlan extends NormalizedCartPlan {
  readonly resolvedItemId?: string;
  readonly resolvedName?: string;
}

export interface CartPlanValidateResult {
  readonly success: boolean;
  readonly schemaVersion: typeof AI_CART_PLAN_VALIDATE_SCHEMA_VERSION;
  readonly status: CartPlanValidateStatus;
  readonly plans: readonly ValidatedCartPlan[];
  readonly clarificationQuestions?: readonly string[];
  readonly issues?: readonly CartPlanValidationIssue[];
  readonly sideEffects: readonly [];
  readonly mutatedState: false;
}

function buildQuoteLine(resolved: ResolvedMenuItemRef, quantity: number): MarketplaceQuoteLine {
  return {
    itemId: resolved.foodId,
    quantity: Math.max(1, Math.floor(quantity)),
    unitPrice: resolved.unitPrice,
    name: resolved.name,
  };
}

function enrichPayload(
  payload: CartPlanPayload,
  resolved: ResolvedMenuItemRef,
  restaurantId: string,
  liveUnitPrice?: number,
): CartPlanPayload {
  const unitPrice = liveUnitPrice ?? resolved.unitPrice;
  return {
    ...payload,
    itemId: resolved.itemId,
    foodId: resolved.foodId,
    restaurantId,
    name: resolved.name,
    unitPrice,
    price: unitPrice,
    ...(resolved.variantId ? { variantId: resolved.variantId } : {}),
    ...(resolved.variantLabel ? { variantLabel: resolved.variantLabel } : {}),
  };
}

function toValidationIssue(
  plan: NormalizedCartPlan,
  issue: CartValidationIssue | { code: string; message: string; itemId?: string },
): CartPlanValidationIssue {
  return {
    planType: plan.type,
    code: issue.code,
    message: issue.message,
    ...(issue.itemId ? { itemId: issue.itemId } : {}),
  };
}

/**
 * Validate cart action plans against Firestore menu + quote rules.
 * Resolves incomplete name/ID payloads with clarification-first ambiguity handling.
 * Never mutates cart state — read-only validation only; plans stay non-executable.
 */
export async function validateCartActionPlan(
  db: Firestore,
  request: ParsedCartPlanRequest,
  plans: readonly NormalizedCartPlan[],
): Promise<CartPlanValidateResult> {
  const clarificationQuestions: string[] = [];
  const issues: CartPlanValidationIssue[] = [];
  const validatedPlans: ValidatedCartPlan[] = [];

  const menuContext = await loadRestaurantMenuMap(db, request.restaurantId);
  if (!menuContext) {
    return {
      success: false,
      schemaVersion: AI_CART_PLAN_VALIDATE_SCHEMA_VERSION,
      status: 'invalid',
      plans: plans.map((plan) => ({ ...plan })),
      issues: [
        {
          planType: plans[0]?.type ?? 'cart_add_plan',
          code: 'RESTAURANT_NOT_FOUND',
          message: 'Restaurant not found',
        },
      ],
      sideEffects: [],
      mutatedState: false,
    };
  }

  const quoteLines: MarketplaceQuoteLine[] = [];
  const quotePlanIndexes: number[] = [];
  const pendingValidated: Array<{
    plan: NormalizedCartPlan;
    resolved: ResolvedMenuItemRef;
    needsQuote: boolean;
  }> = [];

  for (const plan of plans) {
    if (plan.type === 'cart_update_plan' && plan.payload.quantity == null) {
      clarificationQuestions.push('What quantity should this cart item be updated to?');
      issues.push({
        planType: plan.type,
        code: 'MISSING_QUANTITY',
        message: 'cart_update_plan requires quantity',
      });
      continue;
    }

    if (!hasItemReference(plan.payload)) {
      clarificationQuestions.push('Which menu item should this cart change apply to?');
      issues.push({
        planType: plan.type,
        code: 'MISSING_ITEM_REFERENCE',
        message: 'Item reference (itemId, foodId, or name) is required',
      });
      continue;
    }

    if (hasUnresolvedModifiers(plan.payload)) {
      clarificationQuestions.push(
        'Please confirm the exact item variant or modifiers — modifier selection cannot be inferred automatically.',
      );
      issues.push({
        planType: plan.type,
        code: 'MODIFIER_CLARIFICATION_REQUIRED',
        message: 'modifier details must be confirmed explicitly',
      });
      continue;
    }

    if (plan.payload.lineId?.trim() && !plan.payload.itemId && !plan.payload.foodId && !plan.payload.menuItemId && !plan.payload.name) {
      clarificationQuestions.push(
        'Please specify the menu item name or itemId for this cart line — lineId alone cannot be validated safely.',
      );
      issues.push({
        planType: plan.type,
        code: 'LINE_ID_INSUFFICIENT',
        message: 'lineId alone cannot be validated safely',
      });
      continue;
    }

    const resolved = resolveMenuItemFromMenuMap(menuContext.tenantId, menuContext.menuById, {
      itemId: plan.payload.itemId,
      foodId: plan.payload.foodId,
      menuItemId: plan.payload.menuItemId,
      name: plan.payload.name,
      variantId: plan.payload.variantId,
      variantLabel: plan.payload.variantLabel,
    });

    if (resolved.status === 'needs_clarification') {
      clarificationQuestions.push(...resolved.questions);
      issues.push({
        planType: plan.type,
        code: resolved.code,
        message: resolved.questions[0] ?? 'Item reference is ambiguous',
      });
      continue;
    }

    if (resolved.status === 'not_found') {
      clarificationQuestions.push(...resolved.questions);
      issues.push({
        planType: plan.type,
        code: resolved.code,
        message: resolved.questions[0] ?? 'Item no longer on the menu',
        ...(plan.payload.itemId || plan.payload.foodId
          ? { itemId: plan.payload.itemId || plan.payload.foodId }
          : {}),
      });
      // not_found with restaurant menu loaded → invalid path unless other clarifications dominate
      continue;
    }

    const item = resolved.item;
    const needsQuote = plan.type !== 'cart_remove_plan';
    pendingValidated.push({ plan, resolved: item, needsQuote });

    if (needsQuote) {
      quoteLines.push(buildQuoteLine(item, Number(plan.payload.quantity ?? 1)));
      quotePlanIndexes.push(pendingValidated.length - 1);
    }
  }

  const livePriceByFoodId = new Map<string, number>();

  if (quoteLines.length > 0) {
    try {
      const cartResult = await validateMarketplaceCart(db, {
        restaurantId: request.restaurantId,
        orderType: request.orderType,
        lines: quoteLines,
        ...(request.contextToken ? { contextToken: request.contextToken } : {}),
      });

      for (const line of cartResult.resolvedLines) {
        livePriceByFoodId.set(line.itemId, line.unitPrice);
      }

      for (const cartIssue of cartResult.issues) {
        const relatedIdx =
          quotePlanIndexes.find((idx) => pendingValidated[idx]?.resolved.foodId === cartIssue.itemId) ??
          quotePlanIndexes.find((idx) => pendingValidated[idx]?.resolved.itemId === cartIssue.resolvedItemId) ??
          quotePlanIndexes[0];
        const related = relatedIdx != null ? pendingValidated[relatedIdx] : undefined;
        if (related) {
          issues.push(toValidationIssue(related.plan, cartIssue));
        }
      }

      if (!cartResult.valid) {
        const blocking = cartResult.issues.some(
          (issue) => issue.code === 'NOT_FOUND' || issue.code === 'UNAVAILABLE',
        );
        if (blocking) {
          return {
            success: false,
            schemaVersion: AI_CART_PLAN_VALIDATE_SCHEMA_VERSION,
            status: 'invalid',
            plans: pendingValidated.map(({ plan, resolved }) => ({
              ...plan,
              requiresConfirmation: true,
              executable: false,
              resolvedItemId: resolved.foodId,
              resolvedName: resolved.name,
              payload: enrichPayload(plan.payload, resolved, request.restaurantId),
            })),
            issues,
            sideEffects: [],
            mutatedState: false,
          };
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Cart validation failed';
      return {
        success: false,
        schemaVersion: AI_CART_PLAN_VALIDATE_SCHEMA_VERSION,
        status: 'invalid',
        plans: [],
        issues: [
          {
            planType: plans[0]?.type ?? 'cart_add_plan',
            code: 'VALIDATION_ERROR',
            message,
          },
        ],
        sideEffects: [],
        mutatedState: false,
      };
    }
  }

  for (const { plan, resolved } of pendingValidated) {
    const livePrice = livePriceByFoodId.get(resolved.foodId);
    validatedPlans.push({
      ...plan,
      requiresConfirmation: true,
      executable: false,
      resolvedItemId: resolved.foodId,
      resolvedName: resolved.name,
      payload: enrichPayload(plan.payload, resolved, request.restaurantId, livePrice),
    });
  }

  // Prefer clarification when name/fuzzy resolution asked a question, even if some items were not found.
  if (clarificationQuestions.length > 0) {
    const onlyNotFound =
      issues.length > 0 &&
      issues.every((issue) => issue.code === 'NOT_FOUND' || issue.code === 'RESTAURANT_NOT_FOUND');

    if (onlyNotFound && validatedPlans.length === 0) {
      return {
        success: false,
        schemaVersion: AI_CART_PLAN_VALIDATE_SCHEMA_VERSION,
        status: 'invalid',
        plans: validatedPlans,
        clarificationQuestions: Array.from(new Set(clarificationQuestions)),
        issues,
        sideEffects: [],
        mutatedState: false,
      };
    }

    return {
      success: true,
      schemaVersion: AI_CART_PLAN_VALIDATE_SCHEMA_VERSION,
      status: 'needs_clarification',
      plans: validatedPlans,
      clarificationQuestions: Array.from(new Set(clarificationQuestions)),
      ...(issues.length ? { issues } : {}),
      sideEffects: [],
      mutatedState: false,
    };
  }

  if (issues.some((issue) => issue.code === 'NOT_FOUND' || issue.code === 'UNAVAILABLE')) {
    return {
      success: false,
      schemaVersion: AI_CART_PLAN_VALIDATE_SCHEMA_VERSION,
      status: 'invalid',
      plans: validatedPlans,
      issues,
      sideEffects: [],
      mutatedState: false,
    };
  }

  return {
    success: true,
    schemaVersion: AI_CART_PLAN_VALIDATE_SCHEMA_VERSION,
    status: 'validated',
    plans: validatedPlans.map((plan) => ({
      ...plan,
      requiresConfirmation: true,
      executable: false,
    })),
    ...(issues.length ? { issues } : {}),
    sideEffects: [],
    mutatedState: false,
  };
}
