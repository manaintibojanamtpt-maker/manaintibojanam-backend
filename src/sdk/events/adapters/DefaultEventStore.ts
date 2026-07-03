/**
 * EventSDK — default event store (M6 PR-2 infrastructure).
 * In-memory storage for test/dev — provider-neutral interface.
 */

import type { ExtendedEventStorePort } from '../contracts/infrastructurePorts';
import type { EventEnvelope } from '../dto/EventEnvelope';
import type { EventCursor } from '../dto/EventCursor';
import type { EventTypeName, AggregateId } from '../types/branded';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';

export class DefaultEventStore implements ExtendedEventStorePort {
  private readonly events: EventEnvelope[] = [];

  append<TPayload>(envelope: EventEnvelope<TPayload>): SdkAsyncResult<void> {
    this.events.push(envelope);
    return Promise.resolve(sdkOk(undefined));
  }

  read(fromCursor: EventCursor, limit: number): SdkAsyncResult<EventEnvelope[]> {
    let startIndex = 0;
    if (fromCursor.lastEventId) {
      const idx = this.events.findIndex((e) => e.header.eventId === fromCursor.lastEventId);
      startIndex = idx >= 0 ? idx + 1 : 0;
    }
    return Promise.resolve(sdkOk(this.events.slice(startIndex, startIndex + limit)));
  }

  readByAggregate(
    aggregateType: string,
    aggregateId: AggregateId,
    limit: number
  ): SdkAsyncResult<EventEnvelope[]> {
    const filtered = this.events.filter(
      (e) => e.header.aggregateType === aggregateType && e.header.aggregateId === aggregateId
    );
    return Promise.resolve(sdkOk(filtered.slice(0, limit)));
  }

  readByType(type: EventTypeName, limit: number): SdkAsyncResult<EventEnvelope[]> {
    const filtered = this.events.filter((e) => e.header.type === type);
    return Promise.resolve(sdkOk(filtered.slice(0, limit)));
  }

  /** Test helper */
  count(): number {
    return this.events.length;
  }
}

export function createDefaultEventStore(): ExtendedEventStorePort {
  return new DefaultEventStore();
}
