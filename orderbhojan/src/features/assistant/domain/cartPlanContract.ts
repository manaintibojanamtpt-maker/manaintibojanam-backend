import type { ConsumerAssistChannel } from '../types';

/** Cart mutation plan types — informational only; never executed by the client. */
export const CART_PLAN_ACTION_TYPES = [
  'cart_add_plan',
  'cart_update_plan',
  'cart_remove_plan',
] as const;

export type CartPlanActionType = (typeof CART_PLAN_ACTION_TYPES)[number];

export type CartPlanValidateStatus = 'validated' | 'needs_clarification' | 'invalid';

export interface CartPlanAction {
  readonly type: CartPlanActionType;
  readonly requiresConfirmation: true;
  readonly executable: false;
  readonly payload?: Readonly<Record<string, unknown>>;
  readonly reason?: string;
}

export interface CartPlanValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly actionIndex?: number;
  readonly itemId?: string;
}

/** Stable cart-plan validation response for OrderBhojan web + Android (Phase 4+; schema 5.0 adds resolved IDs). */
export interface CartPlanValidationResult {
  readonly schemaVersion: '4.0' | '5.0';
  readonly conversationId: string;
  readonly channel: ConsumerAssistChannel;
  readonly status: CartPlanValidateStatus;
  readonly valid: boolean;
  readonly clarificationQuestions: readonly string[];
  readonly issues: readonly CartPlanValidationIssue[];
  readonly proposedActions: readonly CartPlanAction[];
  readonly executable: false;
  readonly sideEffects: [];
  readonly mutatedState: false;
}

export interface CartPlanValidationRequest {
  readonly restaurantId: string;
  readonly proposedActions: readonly unknown[];
  readonly orderType?: 'delivery' | 'pickup';
  readonly contextToken?: string;
  readonly conversationId?: string;
  readonly authToken?: string | null;
  readonly signal?: AbortSignal;
}

function isCartPlanActionType(value: string): value is CartPlanActionType {
  return (CART_PLAN_ACTION_TYPES as readonly string[]).includes(value);
}

/** Normalize gateway proposed actions / plans into non-executable cart plan objects. */
export function normalizeCartPlanActions(proposedActions: unknown): readonly CartPlanAction[] {
  if (!Array.isArray(proposedActions)) {
    return [];
  }

  const actions: CartPlanAction[] = [];
  for (const raw of proposedActions) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const obj = raw as Record<string, unknown>;
    const type = typeof obj.type === 'string' ? obj.type : '';
    if (!isCartPlanActionType(type)) continue;

    const payload =
      obj.payload && typeof obj.payload === 'object' && !Array.isArray(obj.payload)
        ? (obj.payload as Record<string, unknown>)
        : undefined;

    actions.push({
      type,
      requiresConfirmation: true,
      executable: false,
      ...(payload ? { payload } : {}),
      ...(typeof obj.reason === 'string' ? { reason: obj.reason.slice(0, 500) } : {}),
    });
  }

  return actions;
}

export function normalizeCartPlanIssues(issues: unknown): readonly CartPlanValidationIssue[] {
  if (!Array.isArray(issues)) {
    return [];
  }

  const normalized: CartPlanValidationIssue[] = [];
  for (const raw of issues) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const obj = raw as Record<string, unknown>;
    const code = typeof obj.code === 'string' ? obj.code : 'VALIDATION_ISSUE';
    const message = typeof obj.message === 'string' ? obj.message : 'Cart plan validation issue';
    const actionIndex = typeof obj.actionIndex === 'number' ? obj.actionIndex : undefined;
    const itemId = typeof obj.itemId === 'string' ? obj.itemId : undefined;
    normalized.push({
      code,
      message,
      ...(actionIndex === undefined ? {} : { actionIndex }),
      ...(itemId === undefined ? {} : { itemId }),
    });
  }

  return normalized;
}

export function normalizeClarificationQuestions(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((q): q is string => typeof q === 'string' && q.trim().length > 0).map((q) => q.slice(0, 500));
}

/** Client-side defense: cart plan validation must remain read-only and non-executable. */
export function assertCartPlanNonExecutable(result: CartPlanValidationResult): void {
  if (result.executable !== false || result.sideEffects.length !== 0 || result.mutatedState !== false) {
    throw new Error('Cart plan validation contract violated: plans must not be executable');
  }

  for (const action of result.proposedActions) {
    if (action.executable !== false || action.requiresConfirmation !== true) {
      throw new Error('Cart plan validation contract violated: proposed actions must not be executable');
    }
  }
}
