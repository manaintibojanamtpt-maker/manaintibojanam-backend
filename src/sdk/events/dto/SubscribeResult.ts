import type { SubscriptionId } from '../types/branded';

export interface SubscribeResult {
  readonly subscriptionId: SubscriptionId;
  readonly registeredAt: string;
}
