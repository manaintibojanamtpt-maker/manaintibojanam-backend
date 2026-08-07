/**
 * Purpose: Maps WorkflowTurnResult → deterministic systemReply + proposedActions.
 * Public API: WorkflowResponseMapper, WorkflowTurnResponse
 * Dependencies: WorkflowEngine types, ConversationIntent, localizeWorkflowReply
 * Consumers: ConversationTurnOrchestrator / ConversationEngine
 */

import { ConversationIntent } from '../models/ConversationIntent.js';
import type {
  DeliveryTimeEntity,
  FoodItemEntity,
  QuantityEntity,
} from '../models/ConversationEntity.js';
import type { WorkflowDecisionKind, WorkflowTurnResult } from './WorkflowEngine.js';
import { localizeWorkflowReply } from './localizeWorkflowReply.js';

export interface WorkflowProposedAction {
  readonly type: string;
  readonly payload?: Record<string, unknown>;
}

export interface WorkflowTurnResponse {
  readonly success: boolean;
  readonly decision: WorkflowDecisionKind;
  readonly intent: ConversationIntent;
  readonly systemReply: string;
  readonly proposedActions: readonly WorkflowProposedAction[];
}

export class WorkflowResponseMapper {
  constructor(private readonly locale: string = 'en-IN') {}

  /**
   * Builds a user-facing reply and optional action stubs from a workflow decision.
   */
  public map(turn: WorkflowTurnResult): WorkflowTurnResponse {
    switch (turn.kind) {
      case 'proceed':
        return this.mapProceed(turn);
      case 'clarify':
        return this.mapClarify(turn);
      case 'deny':
        return this.mapDeny(turn);
      default: {
        const _exhaustive: never = turn.kind;
        return _exhaustive;
      }
    }
  }

  private mapProceed(turn: WorkflowTurnResult): WorkflowTurnResponse {
    const { reply, actions } = this.proceedContent(turn);
    return {
      success: true,
      decision: 'proceed',
      intent: turn.intent,
      systemReply: reply,
      proposedActions: actions,
    };
  }

  private mapClarify(turn: WorkflowTurnResult): WorkflowTurnResponse {
    const reply = this.clarifyReply(turn);
    return {
      success: true,
      decision: 'clarify',
      intent: turn.intent,
      systemReply: reply,
      proposedActions: [
        {
          type: 'ask_clarification',
          payload: {
            reason: turn.reason,
            missingEntities: turn.missingEntities ?? [],
          },
        },
      ],
    };
  }

  private mapDeny(turn: WorkflowTurnResult): WorkflowTurnResponse {
    return {
      success: false,
      decision: 'deny',
      intent: turn.intent,
      systemReply: this.denyReply(turn),
      proposedActions: [
        {
          type: 'policy_denied',
          payload: { reason: turn.reason },
        },
      ],
    };
  }

  private proceedContent(turn: WorkflowTurnResult): {
    reply: string;
    actions: WorkflowProposedAction[];
  } {
    switch (turn.intent) {
      case ConversationIntent.Greeting:
        return {
          reply: localizeWorkflowReply('greet', this.locale),
          actions: [{ type: 'greet' }],
        };
      case ConversationIntent.AddItem: {
        const food = turn.entities.find((e): e is FoodItemEntity => e.type === 'FoodItem');
        const qty = turn.entities.find((e): e is QuantityEntity => e.type === 'Quantity');
        const quantity = qty?.numericValue ?? 1;
        const name = food?.normalizedValue || food?.rawValue || 'that item';
        return {
          reply: localizeWorkflowReply('add_item', this.locale, { quantity, name }),
          actions: [
            {
              type: 'add_item',
              payload: {
                menuItemId: food?.menuItemId,
                name,
                quantity,
              },
            },
          ],
        };
      }
      case ConversationIntent.Checkout:
        return {
          reply: localizeWorkflowReply('checkout', this.locale),
          actions: [{ type: 'checkout' }],
        };
      case ConversationIntent.ScheduleDelivery: {
        const delivery = turn.entities.find(
          (e): e is DeliveryTimeEntity => e.type === 'DeliveryTime',
        );
        if (delivery?.mode === 'asap') {
          return {
            reply: localizeWorkflowReply('schedule_asap', this.locale),
            actions: [
              {
                type: 'set_delivery_schedule',
                payload: {
                  deliveryType: 'asap',
                  deliveryTimeSlot: delivery.deliveryTimeSlot ?? 'ASAP',
                  slotLabel: delivery.slotLabel ?? 'ASAP',
                },
              },
            ],
          };
        }
        const slot =
          delivery?.slotLabel ||
          delivery?.deliveryTimeSlot ||
          delivery?.normalizedValue ||
          'that time';
        return {
          reply: localizeWorkflowReply('schedule_set', this.locale, { slot }),
          actions: [
            {
              type: 'set_delivery_schedule',
              payload: {
                deliveryType: 'scheduled',
                deliveryTimeSlot: delivery?.deliveryTimeSlot ?? slot,
                slotLabel: slot,
                ...(delivery?.scheduledForHint
                  ? { scheduledFor: delivery.scheduledForHint }
                  : {}),
              },
            },
          ],
        };
      }
      case ConversationIntent.Cancel:
        return {
          reply: localizeWorkflowReply('cancel', this.locale),
          actions: [{ type: 'cancel' }],
        };
      case ConversationIntent.Confirmation: {
        const confirmed = turn.entities.some(
          (e) => e.type === 'Confirmation' && 'booleanValue' in e && e.booleanValue === true,
        );
        return {
          reply: localizeWorkflowReply(confirmed ? 'confirmed' : 'cancelled', this.locale),
          actions: [
            {
              type: 'confirmation',
              payload: { confirmed },
            },
          ],
        };
      }
      default:
        return {
          reply: localizeWorkflowReply('ok', this.locale),
          actions: [{ type: 'noop', payload: { intent: turn.intent } }],
        };
    }
  }

  private clarifyReply(turn: WorkflowTurnResult): string {
    if (turn.missingEntities?.includes('FoodItem') || turn.reason === 'MissingFoodItem') {
      return localizeWorkflowReply('missing_food', this.locale);
    }
    if (turn.missingEntities?.includes('Address')) {
      return localizeWorkflowReply('missing_address', this.locale);
    }
    if (
      turn.missingEntities?.includes('DeliveryTime') ||
      turn.reason === 'MissingDeliveryTime' ||
      turn.reason === 'AmbiguousDeliveryTime' ||
      turn.reason === 'InvalidDeliveryTime' ||
      turn.reason === 'OutOfHorizonDeliveryTime' ||
      turn.pipeline.clarificationReason === 'MissingDeliveryTime' ||
      turn.pipeline.clarificationReason === 'OutOfHorizonDeliveryTime' ||
      turn.pipeline.clarificationReason === 'AmbiguousDeliveryTime'
    ) {
      if (
        turn.reason === 'OutOfHorizonDeliveryTime' ||
        turn.pipeline.clarificationReason === 'OutOfHorizonDeliveryTime'
      ) {
        return localizeWorkflowReply('schedule_horizon', this.locale);
      }
      if (turn.reason === 'AmbiguousDeliveryTime') {
        return localizeWorkflowReply('ambiguous_schedule', this.locale);
      }
      if (turn.reason === 'InvalidDeliveryTime') {
        return localizeWorkflowReply('invalid_schedule', this.locale);
      }
      return localizeWorkflowReply('missing_schedule', this.locale);
    }
    if (turn.intent === ConversationIntent.Unknown || turn.reason === 'NoMatchingIntent') {
      return localizeWorkflowReply('unknown', this.locale);
    }
    if (turn.reason === 'UnrecognizedIntent') {
      return localizeWorkflowReply('unknown', this.locale);
    }
    return localizeWorkflowReply('clarify', this.locale);
  }

  private denyReply(turn: WorkflowTurnResult): string {
    if (turn.reason && /Cart is empty/i.test(turn.reason)) {
      return localizeWorkflowReply('empty_cart', this.locale);
    }
    return turn.reason || localizeWorkflowReply('deny', this.locale);
  }
}
