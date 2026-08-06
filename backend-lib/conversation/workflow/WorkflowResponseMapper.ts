/**
 * Purpose: Maps WorkflowTurnResult → deterministic systemReply + proposedActions.
 * Public API: WorkflowResponseMapper, WorkflowTurnResponse
 * Dependencies: WorkflowEngine types, ConversationIntent, ConversationEntity
 * Consumers: Future ConversationEngine / gateway adapters (not wired yet)
 *
 * Non-goals: LLM copy, session mutation, ConversationEngine integration.
 */

import { ConversationIntent } from '../models/ConversationIntent.js';
import type { FoodItemEntity, QuantityEntity } from '../models/ConversationEntity.js';
import type { WorkflowDecisionKind, WorkflowTurnResult } from './WorkflowEngine.js';

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
          reply: 'Hello! What would you like to order?',
          actions: [{ type: 'greet' }],
        };
      case ConversationIntent.AddItem: {
        const food = turn.entities.find((e): e is FoodItemEntity => e.type === 'FoodItem');
        const qty = turn.entities.find((e): e is QuantityEntity => e.type === 'Quantity');
        const quantity = qty?.numericValue ?? 1;
        const name = food?.normalizedValue || food?.rawValue || 'that item';
        return {
          reply: `Adding ${quantity} × ${name} to your cart.`,
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
          reply: 'Alright, proceeding to checkout.',
          actions: [{ type: 'checkout' }],
        };
      case ConversationIntent.Cancel:
        return {
          reply: 'Okay, I cancelled that.',
          actions: [{ type: 'cancel' }],
        };
      case ConversationIntent.Confirmation: {
        const confirmed = turn.entities.some(
          (e) => e.type === 'Confirmation' && 'booleanValue' in e && e.booleanValue === true,
        );
        return {
          reply: confirmed ? 'Confirmed.' : 'Okay, cancelled.',
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
          reply: 'Okay.',
          actions: [{ type: 'noop', payload: { intent: turn.intent } }],
        };
    }
  }

  private clarifyReply(turn: WorkflowTurnResult): string {
    if (turn.missingEntities?.includes('FoodItem') || turn.reason === 'MissingFoodItem') {
      return 'Which item would you like to add?';
    }
    if (turn.missingEntities?.includes('Address')) {
      return 'Please share your delivery address to continue checkout.';
    }
    if (turn.intent === ConversationIntent.Unknown || turn.reason === 'NoMatchingIntent') {
      return "Sorry, I didn't catch that. You can add an item, checkout, or cancel.";
    }
    if (turn.reason === 'UnrecognizedIntent') {
      return "Sorry, I didn't catch that. You can add an item, checkout, or cancel.";
    }
    return 'Could you clarify that for me?';
  }

  private denyReply(turn: WorkflowTurnResult): string {
    if (turn.reason && /Cart is empty/i.test(turn.reason)) {
      return 'Your cart is empty. Add something before checkout.';
    }
    return turn.reason || 'I cannot do that right now.';
  }
}
