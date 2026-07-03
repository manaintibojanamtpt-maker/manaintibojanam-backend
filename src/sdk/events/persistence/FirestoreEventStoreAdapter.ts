/**
 * EventSDK — Firestore event store adapter (M6 PR-3).
 * Implements EventStorePort — no contract changes.
 */

import type { EventStorePort } from '../contracts/ports';
import type { ExtendedEventStorePort } from '../contracts/infrastructurePorts';
import type { EventEnvelope } from '../dto/EventEnvelope';
import type { EventCursor } from '../dto/EventCursor';
import type { EventTypeName, AggregateId } from '../types/branded';
import type { ClockPort } from '../contracts/ports';
import type { SdkAsyncResult } from '../../core/result';
import { sdkFromError, sdkOk } from '../../core/resultHelpers';
import type { FirestorePersistencePort } from './FirestorePersistencePort';
import type { EventPersistenceCollectionNames } from './collectionNames';
import { DEFAULT_EVENT_PERSISTENCE_COLLECTIONS } from './collectionNames';
import {
  mapDocumentToEnvelope,
  mapEnvelopeToEventStoreDocument,
} from './mappers/eventStoreMapper';
import type { EventPersistenceTelemetryHook } from './PersistenceTelemetry';
import { createPersistenceTelemetryEmitter } from './PersistenceTelemetry';

export interface FirestoreEventStoreAdapterOptions {
  readonly persistence: FirestorePersistencePort;
  readonly clock: ClockPort;
  readonly collections?: Partial<EventPersistenceCollectionNames>;
  readonly onTelemetry?: EventPersistenceTelemetryHook;
}

export class FirestoreEventStoreAdapter implements ExtendedEventStorePort, EventStorePort {
  private readonly collection: string;

  constructor(private readonly options: FirestoreEventStoreAdapterOptions) {
    this.collection =
      options.collections?.eventStore ?? DEFAULT_EVENT_PERSISTENCE_COLLECTIONS.eventStore;
  }

  async append<TPayload>(envelope: EventEnvelope<TPayload>): SdkAsyncResult<void> {
    const telemetry = createPersistenceTelemetryEmitter(
      this.options.onTelemetry,
      'append',
      envelope.metadata.correlationId
    );
    try {
      telemetry.persistStarted(this.collection, envelope.header.eventId);
      const data = mapEnvelopeToEventStoreDocument(envelope, this.options.clock.now());
      await this.options.persistence.set(this.collection, envelope.header.eventId, data);
      telemetry.persistCompleted(this.collection, envelope.header.eventId);
      return sdkOk(undefined);
    } catch (error) {
      telemetry.persistFailed('INTERNAL', this.collection);
      return sdkFromError(error);
    }
  }

  async read(fromCursor: EventCursor, limit: number): SdkAsyncResult<EventEnvelope[]> {
    const telemetry = createPersistenceTelemetryEmitter(this.options.onTelemetry, 'read');
    try {
      telemetry.persistStarted(this.collection);
      const docs = await this.options.persistence.query(this.collection, [], limit * 2);
      let events = docs.map((d) => mapDocumentToEnvelope(d.data));

      if (fromCursor.lastEventId) {
        const idx = events.findIndex((e) => e.header.eventId === fromCursor.lastEventId);
        events = idx >= 0 ? events.slice(idx + 1) : events;
      }

      telemetry.persistCompleted(this.collection);
      return sdkOk(events.slice(0, limit));
    } catch (error) {
      telemetry.persistFailed('INTERNAL', this.collection);
      return sdkFromError(error);
    }
  }

  async readByAggregate(
    aggregateType: string,
    aggregateId: AggregateId,
    limit: number
  ): SdkAsyncResult<EventEnvelope[]> {
    const telemetry = createPersistenceTelemetryEmitter(this.options.onTelemetry, 'readByAggregate');
    try {
      telemetry.persistStarted(this.collection);
      const docs = await this.options.persistence.query(
        this.collection,
        [
          { field: 'aggregateType', op: '==', value: aggregateType },
          { field: 'aggregateId', op: '==', value: aggregateId },
        ],
        limit
      );
      telemetry.persistCompleted(this.collection);
      return sdkOk(docs.map((d) => mapDocumentToEnvelope(d.data)));
    } catch (error) {
      telemetry.persistFailed('INTERNAL', this.collection);
      return sdkFromError(error);
    }
  }

  async readByType(type: EventTypeName, limit: number): SdkAsyncResult<EventEnvelope[]> {
    const telemetry = createPersistenceTelemetryEmitter(this.options.onTelemetry, 'readByType');
    try {
      telemetry.persistStarted(this.collection);
      const docs = await this.options.persistence.query(
        this.collection,
        [{ field: 'eventType', op: '==', value: type }],
        limit
      );
      telemetry.persistCompleted(this.collection);
      return sdkOk(docs.map((d) => mapDocumentToEnvelope(d.data)));
    } catch (error) {
      telemetry.persistFailed('INTERNAL', this.collection);
      return sdkFromError(error);
    }
  }
}

export function createFirestoreEventStoreAdapter(
  options: FirestoreEventStoreAdapterOptions
): ExtendedEventStorePort {
  return new FirestoreEventStoreAdapter(options);
}
