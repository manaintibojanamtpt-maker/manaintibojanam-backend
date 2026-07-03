import type { SubscriptionId, EventTypeName } from '../types/branded';

export type SubscriptionStatus = 'active' | 'paused' | 'draining';

/** Consumer subscription contract — provider-neutral. */
export interface Subscription {
  readonly subscriptionId: SubscriptionId;
  readonly consumerGroup: string;
  readonly eventTypes: readonly EventTypeName[];
  readonly status: SubscriptionStatus;
  readonly createdAt: string;
  readonly dlqEnabled: boolean;
}
