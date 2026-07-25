import type { AssistantMode } from './types.js';
import type { AssistantIntent } from './intentTaxonomy.js';
import { isIntentAllowedForMode } from './intentTaxonomy.js';
import type { AiProposedAction, AiStructuredAssistResult } from './structuredOutput.js';
import {
  isCartPlanActionType,
  parseCartPlansFromProposedActions,
  type NormalizedCartPlan,
} from './cartActionPlan.js';

export type SafetyViolationCode =
  | 'MODE_INTENT_MISMATCH'
  | 'CROSS_MODE_ACTION'
  | 'MUTATION_NOT_ALLOWED'
  | 'PLACE_ORDER_BLOCKED'
  | 'EXECUTABLE_FLAG_FORBIDDEN'
  | 'CLAIMED_SIDE_EFFECT'
  | 'EMPTY_REPLY'
  | 'CART_PLAN_MODE_FORBIDDEN'
  | 'CART_PLAN_EXECUTABLE_FORBIDDEN';

export interface SafetyViolation {
  readonly code: SafetyViolationCode;
  readonly message: string;
}

export interface SafetyEvaluation {
  readonly allowed: boolean;
  readonly violations: readonly SafetyViolation[];
  readonly sanitized: AiStructuredAssistResult;
}

const CONSUMER_ONLY_ACTIONS = new Set([
  'cart_add_plan',
  'cart_update_plan',
  'cart_remove_plan',
  'place_order',
]);

const MARKETING_ONLY_ACTIONS = new Set(['suggest_signup', 'suggest_demo', 'suggest_contact']);

const MUTATION_ACTIONS = new Set([
  'cart_add_plan',
  'cart_update_plan',
  'cart_remove_plan',
  'place_order',
]);

/**
 * Phase 2 guardrails: validate structured output; never execute actions.
 * Mutation-class plans are retained as non-executable plans unless hard-blocked (place_order always blocked from assist path).
 */
export function evaluateAssistSafety(
  structured: AiStructuredAssistResult,
  options: {
    readonly allowMutationPlans?: boolean;
    /** Phase 3: drop mutation plans entirely (do not retain cart_* / place_order plans). */
    readonly readOnlyConsumer?: boolean;
  } = {},
): SafetyEvaluation {
  const allowMutationPlans = options.allowMutationPlans === true;
  const readOnlyConsumer = options.readOnlyConsumer === true;
  const violations: SafetyViolation[] = [];
  const mode = structured.mode;

  if (!structured.reply.trim()) {
    violations.push({ code: 'EMPTY_REPLY', message: 'Assistant reply must not be empty' });
  }

  if (!isIntentAllowedForMode(mode, structured.intent)) {
    violations.push({
      code: 'MODE_INTENT_MISMATCH',
      message: `Intent ${structured.intent} is not allowed for mode ${mode}`,
    });
  }

  const sanitizedActions: AiProposedAction[] = [];

  for (const action of structured.proposedActions) {
    if ((action as { executable?: boolean }).executable === true) {
      violations.push({
        code: 'EXECUTABLE_FLAG_FORBIDDEN',
        message: 'proposedActions.executable must always be false',
      });
    }

    if (mode === 'merchant_marketing' && CONSUMER_ONLY_ACTIONS.has(action.type)) {
      violations.push({
        code: 'CROSS_MODE_ACTION',
        message: `Action ${action.type} is not allowed in merchant_marketing mode`,
      });
      continue;
    }

    if (mode === 'consumer_ordering' && MARKETING_ONLY_ACTIONS.has(action.type)) {
      violations.push({
        code: 'CROSS_MODE_ACTION',
        message: `Action ${action.type} is not allowed in consumer_ordering mode`,
      });
      continue;
    }

    if (action.type === 'place_order') {
      violations.push({
        code: 'PLACE_ORDER_BLOCKED',
        message: 'place_order is blocked; orders require explicit backend checkout confirmation',
      });
      continue;
    }

    if (MUTATION_ACTIONS.has(action.type) && !allowMutationPlans) {
      // Retain cart_* plans as non-executable proposals so clients can validate + confirm.
      // place_order is already hard-blocked above. Never mark executable.
      violations.push({
        code: 'MUTATION_NOT_ALLOWED',
        message: readOnlyConsumer
          ? `Mutation plan ${action.type} retained as non-executable proposal (confirm-to-apply)`
          : `Mutation plan ${action.type} is not executable (plan retained as non-executable)`,
      });
      sanitizedActions.push({
        type: action.type,
        requiresConfirmation: true,
        executable: false,
        ...(action.payload ? { payload: action.payload } : {}),
        reason: readOnlyConsumer
          ? 'consumer_plan_only_confirm_required'
          : 'phase2_plan_only_not_executed',
      });
      continue;
    }

    sanitizedActions.push({
      type: action.type,
      requiresConfirmation: MUTATION_ACTIONS.has(action.type) ? true : action.requiresConfirmation,
      executable: false,
      ...(action.payload ? { payload: action.payload } : {}),
      ...(action.reason ? { reason: action.reason } : {}),
    });
  }

  if (sanitizedActions.length === 0) {
    sanitizedActions.push({ type: 'none', requiresConfirmation: false, executable: false });
  }

  const hardBlock = violations.some((v) =>
    v.code === 'MODE_INTENT_MISMATCH' ||
    v.code === 'EMPTY_REPLY' ||
    v.code === 'PLACE_ORDER_BLOCKED' ||
    v.code === 'CROSS_MODE_ACTION',
  );

  const intent: AssistantIntent =
    isIntentAllowedForMode(mode, structured.intent) ? structured.intent : 'out_of_scope';

  const reasons = [
    ...structured.safety.reasons,
    ...violations.map((v) => v.code.toLowerCase()),
  ];

  const sanitized: AiStructuredAssistResult = {
    ...structured,
    intent,
    proposedActions: sanitizedActions,
    safety: {
      blocked: hardBlock || structured.safety.blocked || intent === 'out_of_scope',
      reasons: Array.from(new Set(reasons)),
    },
  };

  // Phase 2: MUTATION_NOT_ALLOWED is a soft violation (plan kept, not executed).
  const softOnly =
    violations.length > 0 &&
    violations.every((v) => v.code === 'MUTATION_NOT_ALLOWED' || v.code === 'EXECUTABLE_FLAG_FORBIDDEN');

  return {
    allowed: !hardBlock && (violations.length === 0 || softOnly),
    violations,
    sanitized,
  };
}

/** Reply text must not claim completed mutations (lightweight heuristic). */
export function detectClaimedSideEffects(reply: string): boolean {
  const text = reply.trim();
  if (!text) return false;

  if (
    /\b(added to (your )?cart|removed from (your )?cart|order (has been )?placed|payment (was )?captured)\b/i.test(
      text,
    )
  ) {
    return true;
  }

  // High-risk outcome promises (cancel / refund / payment fix) — triage must not claim completion.
  if (
    /\b((your )?refund (has been|was|is being) (processed|issued|completed|sent)|money (has been|was) (returned|refunded)|payment (has been|was) refunded)\b/i.test(
      text,
    )
  ) {
    return true;
  }
  if (
    /\b(i (have|'ve)|we (have|'ve)|your order (has been|was))\s+(cancelled|canceled|refunded)\b/i.test(
      text,
    )
  ) {
    return true;
  }
  if (/\b(cancellation|refund|payment)\s+(is|was)\s+(complete|completed|successful|done)\b/i.test(text)) {
    return true;
  }

  return false;
}

/** Phase 4: validate cart-plan request safety before Firestore checks. */
export function evaluateCartPlanRequestSafety(
  params: {
    readonly mode: unknown;
    readonly proposedActions: unknown;
  },
): {
  readonly allowed: boolean;
  readonly violations: readonly SafetyViolation[];
  readonly sanitizedPlans: readonly NormalizedCartPlan[];
} {
  const violations: SafetyViolation[] = [];

  if (params.mode !== 'consumer_ordering') {
    violations.push({
      code: 'CART_PLAN_MODE_FORBIDDEN',
      message: 'Cart plan validation is only allowed for consumer_ordering mode',
    });
    return { allowed: false, violations, sanitizedPlans: [] };
  }

  const { plans, rejectedPlaceOrder } = parseCartPlansFromProposedActions(params.proposedActions);

  if (rejectedPlaceOrder) {
    violations.push({
      code: 'PLACE_ORDER_BLOCKED',
      message: 'place_order is blocked; orders require explicit backend checkout confirmation',
    });
  }

  violations.push(...assertCartPlanActionsNonExecutable(params.proposedActions));

  const sanitizedPlans = plans.map((plan) => ({
    ...plan,
    requiresConfirmation: true as const,
    executable: false as const,
  }));

  const hardBlock = violations.some(
    (v) =>
      v.code === 'PLACE_ORDER_BLOCKED' ||
      v.code === 'CART_PLAN_MODE_FORBIDDEN' ||
      v.code === 'CART_PLAN_EXECUTABLE_FORBIDDEN',
  );

  return {
    allowed: !hardBlock && sanitizedPlans.length > 0,
    violations,
    sanitizedPlans,
  };
}

export function assertCartPlanActionsNonExecutable(
  proposedActions: unknown,
): readonly SafetyViolation[] {
  const violations: SafetyViolation[] = [];
  if (!Array.isArray(proposedActions)) return violations;

  for (const raw of proposedActions) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const action = raw as Record<string, unknown>;
    if (action.executable === true && (isCartPlanActionType(action.type) || action.type === 'place_order')) {
      violations.push({
        code: 'CART_PLAN_EXECUTABLE_FORBIDDEN',
        message: 'proposedActions.executable must always be false',
      });
    }
  }

  return violations;
}

export function applyClaimedSideEffectGuard(
  evaluation: SafetyEvaluation,
): SafetyEvaluation {
  if (!detectClaimedSideEffects(evaluation.sanitized.reply)) {
    return evaluation;
  }
  const violation: SafetyViolation = {
    code: 'CLAIMED_SIDE_EFFECT',
    message: 'Reply claimed a cart/order mutation without backend confirmation',
  };
  const disclaimer =
    '\n\n(Note: No cart or order changes were applied. Confirm any changes in the app.)';
  return {
    allowed: false,
    violations: [...evaluation.violations, violation],
    sanitized: {
      ...evaluation.sanitized,
      reply: evaluation.sanitized.reply.includes('No cart or order changes were applied')
        ? evaluation.sanitized.reply
        : `${evaluation.sanitized.reply}${disclaimer}`,
      safety: {
        blocked: true,
        reasons: Array.from(
          new Set([...evaluation.sanitized.safety.reasons, 'claimed_side_effect']),
        ),
      },
    },
  };
}
