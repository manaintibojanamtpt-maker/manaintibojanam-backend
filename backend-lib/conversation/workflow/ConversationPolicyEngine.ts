/**
 * Purpose: Evaluates business policies against the current conversation state and resolved intent/entities.
 * Public API: ConversationPolicyEngine
 * Dependencies: ConversationState, ConversationIntent, ConversationEntity
 * Consumers: WorkflowEngine, RestaurantBrain
 */

import type { ConversationState } from '../models/ConversationState.js';
import { ConversationIntent } from '../models/ConversationIntent.js';
import type { ConversationEntity } from '../models/ConversationEntity.js';

export interface PolicyEvaluationResult {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly missingEntities?: string[];
}

export class ConversationPolicyEngine {
  /**
   * Evaluates if the requested intent can be executed given the current state and extracted entities.
   */
  public evaluate(
    intent: ConversationIntent,
    entities: readonly ConversationEntity[],
    state: ConversationState
  ): PolicyEvaluationResult {
    switch (intent) {
      case ConversationIntent.AddItem:
        return this.evaluateAddItem(entities);
      case ConversationIntent.RemoveItem:
        return this.evaluateRemoveItem(entities);
      case ConversationIntent.Checkout:
        return this.evaluateCheckout(entities, state);
      case ConversationIntent.TrackOrder:
        return this.evaluateTrackOrder(state);
      default:
        // Safe intents (Browse, Greeting, Help, Cancel) are always allowed.
        return { allowed: true };
    }
  }

  private evaluateAddItem(entities: readonly ConversationEntity[]): PolicyEvaluationResult {
    const hasFoodItem = entities.some(e => e.type === 'FoodItem');
    const missing = [];

    if (!hasFoodItem) {
      missing.push('FoodItem');
    }

    if (missing.length > 0) {
      return {
        allowed: false,
        reason: 'Missing required entities to add an item to the cart.',
        missingEntities: missing,
      };
    }

    return { allowed: true };
  }

  private evaluateRemoveItem(entities: readonly ConversationEntity[]): PolicyEvaluationResult {
    const hasFoodItem = entities.some(e => e.type === 'FoodItem');
    
    if (!hasFoodItem) {
      return {
        allowed: false,
        reason: 'Must specify which item to remove.',
        missingEntities: ['FoodItem'],
      };
    }

    return { allowed: true };
  }

  private evaluateCheckout(entities: readonly ConversationEntity[], state: ConversationState): PolicyEvaluationResult {
    // Phase 3: We don't have the actual cart contents in state yet, 
    // but in a real scenario we'd verify the cart is not empty.
    if (!state.currentCartReference) {
      return {
        allowed: false,
        reason: 'Cart is empty or missing.',
      };
    }

    const hasAddress = entities.some(e => e.type === 'Address');
    const missing = [];

    if (!hasAddress) {
      missing.push('Address');
    }

    if (missing.length > 0) {
      return {
        allowed: false,
        reason: 'Delivery address is required for checkout.',
        missingEntities: missing,
      };
    }

    return { allowed: true };
  }

  private evaluateTrackOrder(state: ConversationState): PolicyEvaluationResult {
    // Requires a customerId to track an order historically.
    if (!state.customerId) {
      return {
        allowed: false,
        reason: 'Customer must be authenticated/identified to track orders.',
      };
    }
    return { allowed: true };
  }
}
