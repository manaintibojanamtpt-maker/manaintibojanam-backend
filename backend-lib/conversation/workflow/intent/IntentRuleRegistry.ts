import type { IntentRule } from './IntentRule.js';

/**
 * Purpose: Maintains the collection of IntentRules in priority order.
 * Ensures rule evaluation is completely deterministic.
 */
export class IntentRuleRegistry {
  private rules: IntentRule[] = [];

  /**
   * Registers a new rule and immediately re-sorts the registry by priority descending.
   * Priority strategy: Higher numbers run first.
   */
  public register(rule: IntentRule): void {
    // Prevent duplicate registrations by name
    if (this.rules.some(r => r.name === rule.name)) {
      return;
    }
    
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Returns all registered rules in priority order.
   */
  public getRules(): readonly IntentRule[] {
    return this.rules;
  }
}
