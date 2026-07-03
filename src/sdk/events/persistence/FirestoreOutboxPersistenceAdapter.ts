/**
 * EventSDK — Firestore outbox persistence adapter (M6 PR-3).
 * Implements OutboxRepositoryPort — no contract changes.
 */

import type { OutboxRepositoryPort } from '../contracts/ports';
import type { ExtendedOutboxRepositoryPort } from '../contracts/infrastructurePorts';
import type { OutboxRecord } from '../dto/OutboxRecord';
import type { ClockPort, UuidPort } from '../contracts/ports';
import type { SdkAsyncResult } from '../../core/result';
import { sdkFromError, sdkOk } from '../../core/resultHelpers';
import type { FirestorePersistencePort } from './FirestorePersistencePort';
import type { EventPersistenceCollectionNames } from './collectionNames';
import { DEFAULT_EVENT_PERSISTENCE_COLLECTIONS } from './collectionNames';
import {
  mapDocumentToOutboxRecord,
  mapOutboxAppendToDocument,
} from './mappers/outboxMapper';
import { asOutboxId } from '../types/branded';
import type { EventPersistenceTelemetryHook } from './PersistenceTelemetry';
import { createPersistenceTelemetryEmitter } from './PersistenceTelemetry';

export interface FirestoreOutboxPersistenceAdapterOptions {
  readonly persistence: FirestorePersistencePort;
  readonly clock: ClockPort;
  readonly uuid: UuidPort;
  readonly collections?: Partial<EventPersistenceCollectionNames>;
  readonly onTelemetry?: EventPersistenceTelemetryHook;
}

export class FirestoreOutboxPersistenceAdapter implements ExtendedOutboxRepositoryPort, OutboxRepositoryPort {
  private readonly collection: string;

  constructor(private readonly options: FirestoreOutboxPersistenceAdapterOptions) {
    this.collection =
      options.collections?.outbox ?? DEFAULT_EVENT_PERSISTENCE_COLLECTIONS.outbox;
  }

  async append<TPayload>(
    record: Omit<OutboxRecord<TPayload>, 'outboxId' | 'createdAt'>
  ): SdkAsyncResult<OutboxRecord<TPayload>> {
    const telemetry = createPersistenceTelemetryEmitter(
      this.options.onTelemetry,
      'append',
      record.envelope.metadata.correlationId
    );
    const elapsed = (): number => 0;
    const outboxId = asOutboxId(this.options.uuid.generate());
    const createdAt = this.options.clock.now();

    try {
      telemetry.persistStarted(this.collection, outboxId);
      const data = mapOutboxAppendToDocument(record, outboxId, createdAt);
      await this.options.persistence.set(this.collection, outboxId, data);
      telemetry.persistCompleted(this.collection, outboxId, elapsed);
      telemetry.outboxWritten(record.eventId, record.type, outboxId);

      return sdkOk({
        ...record,
        outboxId,
        createdAt,
      });
    } catch (error) {
      telemetry.persistFailed('INTERNAL', this.collection);
      return sdkFromError(error);
    }
  }

  async listPending(limit: number): SdkAsyncResult<OutboxRecord[]> {
    return this.fetchPending(limit);
  }

  async fetchPending(limit: number): SdkAsyncResult<OutboxRecord[]> {
    const telemetry = createPersistenceTelemetryEmitter(this.options.onTelemetry, 'fetchPending');
    try {
      telemetry.persistStarted(this.collection);
      const docs = await this.options.persistence.query(
        this.collection,
        [
          { field: 'status', op: '==', value: 'pending' },
          { field: 'published', op: '==', value: false },
        ],
        limit
      );
      telemetry.persistCompleted(this.collection);
      return sdkOk(docs.map((d) => mapDocumentToOutboxRecord(d.data)));
    } catch (error) {
      telemetry.persistFailed('INTERNAL', this.collection);
      return sdkFromError(error);
    }
  }

  async markPublished(outboxId: string, publishedAt: string): SdkAsyncResult<void> {
    const telemetry = createPersistenceTelemetryEmitter(this.options.onTelemetry, 'markPublished');
    try {
      telemetry.persistStarted(this.collection, outboxId);
      await this.options.persistence.update(this.collection, outboxId, {
        status: 'published',
        published: true,
        publishedAt,
      });
      telemetry.persistCompleted(this.collection, outboxId);
      return sdkOk(undefined);
    } catch (error) {
      telemetry.persistFailed('INTERNAL', this.collection);
      return sdkFromError(error);
    }
  }

  async markFailed(outboxId: string, error: string): SdkAsyncResult<void> {
    const telemetry = createPersistenceTelemetryEmitter(this.options.onTelemetry, 'markFailed');
    try {
      telemetry.persistStarted(this.collection, outboxId);
      const existing = await this.options.persistence.get(this.collection, outboxId);
      const attemptCount = Number(existing?.data.attemptCount ?? 0) + 1;
      await this.options.persistence.update(this.collection, outboxId, {
        status: 'failed',
        published: false,
        lastError: error,
        attemptCount,
      });
      telemetry.persistCompleted(this.collection, outboxId);
      return sdkOk(undefined);
    } catch (err) {
      telemetry.persistFailed('INTERNAL', this.collection);
      return sdkFromError(err);
    }
  }
}

export function createFirestoreOutboxPersistenceAdapter(
  options: FirestoreOutboxPersistenceAdapterOptions
): ExtendedOutboxRepositoryPort {
  return new FirestoreOutboxPersistenceAdapter(options);
}
