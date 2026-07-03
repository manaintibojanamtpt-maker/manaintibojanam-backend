/**
 * Event domain — replay policy (pure, M6 PR-1).
 */

import type { ReplayPlanInput, ReplayPlanResult } from '../shared/EventTypes';

export function planReplay(input: ReplayPlanInput, replayEnabled: boolean): ReplayPlanResult {
  if (!replayEnabled) {
    return {
      consumerGroup: input.consumerGroup,
      estimatedEvents: 0,
      dryRun: input.dryRun ?? false,
      allowed: false,
      reason: 'Replay is disabled',
    };
  }

  if (!input.consumerGroup) {
    return {
      consumerGroup: input.consumerGroup,
      estimatedEvents: 0,
      dryRun: input.dryRun ?? false,
      allowed: false,
      reason: 'consumerGroup is required',
    };
  }

  return {
    consumerGroup: input.consumerGroup,
    estimatedEvents: -1,
    dryRun: input.dryRun ?? false,
    allowed: true,
  };
}

export function filterEventsByType<T extends { header: { type: string } }>(
  events: readonly T[],
  eventTypes?: readonly string[]
): T[] {
  if (!eventTypes?.length) return [...events];
  const types = new Set(eventTypes);
  return events.filter((e) => types.has(e.header.type));
}
