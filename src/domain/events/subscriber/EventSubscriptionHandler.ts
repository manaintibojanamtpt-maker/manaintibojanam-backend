/**
 * Event domain — subscription matching (pure, M6 PR-1).
 */

export interface SubscriptionFilter {
  readonly consumerGroup: string;
  readonly eventTypes: readonly string[];
  readonly status: 'active' | 'paused' | 'draining';
}

export function matchesSubscription(
  filter: SubscriptionFilter,
  eventType: string
): boolean {
  if (filter.status !== 'active') return false;
  if (filter.eventTypes.length === 0) return true;
  return filter.eventTypes.includes(eventType);
}

export function validateSubscriptionFilter(
  filter: SubscriptionFilter
): readonly string[] {
  const errors: string[] = [];
  if (!filter.consumerGroup) errors.push('consumerGroup is required');
  if (!filter.eventTypes || filter.eventTypes.length === 0) {
    errors.push('eventTypes must contain at least one type');
  }
  return errors;
}
