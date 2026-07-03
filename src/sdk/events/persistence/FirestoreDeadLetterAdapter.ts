/**
 * EventSDK — Firestore dead-letter adapter (M6 PR-3).
 * Implements DeadLetterPort — no contract changes.
 */

import type { DeadLetterPort } from '../contracts/ports';
import type { DeadLetterRecord } from '../dto/DeadLetterRecord';
import type { ClockPort, UuidPort } from '../contracts/ports';
import type { SdkAsyncResult } from '../../core/result';
import { sdkFromError, sdkOk } from '../../core/resultHelpers';
import type { FirestorePersistencePort } from './FirestorePersistencePort';
import type { EventPersistenceCollectionNames } from './collectionNames';
import { DEFAULT_EVENT_PERSISTENCE_COLLECTIONS } from './collectionNames';
import {
  mapDeadLetterToDocument,
  mapDocumentToDeadLetterRecord,
} from './mappers/deadLetterMapper';
import type { EventPersistenceTelemetryHook } from './PersistenceTelemetry';
import { createPersistenceTelemetryEmitter } from './PersistenceTelemetry';

export interface FirestoreDeadLetterAdapterOptions {
  readonly persistence: FirestorePersistencePort;
  readonly clock: ClockPort;
  readonly uuid: UuidPort;
  readonly collections?: Partial<EventPersistenceCollectionNames>;
  readonly onTelemetry?: EventPersistenceTelemetryHook;
}

export class FirestoreDeadLetterAdapter implements DeadLetterPort {
  private readonly collection: string;

  constructor(private readonly options: FirestoreDeadLetterAdapterOptions) {
    this.collection =
      options.collections?.deadLetters ?? DEFAULT_EVENT_PERSISTENCE_COLLECTIONS.deadLetters;
  }

  async record<TPayload>(
    entry: Omit<DeadLetterRecord<TPayload>, 'deadLetterId' | 'failedAt'>
  ): SdkAsyncResult<DeadLetterRecord<TPayload>> {
    const telemetry = createPersistenceTelemetryEmitter(
      this.options.onTelemetry,
      'record',
      entry.envelope.metadata.correlationId
    );
    const deadLetterId = this.options.uuid.generate();
    const failedAt = this.options.clock.now();

    try {
      telemetry.persistStarted(this.collection, deadLetterId);
      const data = mapDeadLetterToDocument(entry, deadLetterId, failedAt);
      await this.options.persistence.set(this.collection, deadLetterId, data);
      telemetry.persistCompleted(this.collection, deadLetterId);

      return sdkOk({
        ...entry,
        deadLetterId,
        failedAt,
      });
    } catch (error) {
      telemetry.persistFailed('INTERNAL', this.collection);
      return sdkFromError(error);
    }
  }

  async list(consumerGroup: string, limit: number): SdkAsyncResult<DeadLetterRecord[]> {
    const telemetry = createPersistenceTelemetryEmitter(this.options.onTelemetry, 'list');
    try {
      telemetry.persistStarted(this.collection);
      const docs = await this.options.persistence.query(
        this.collection,
        [{ field: 'consumerGroup', op: '==', value: consumerGroup }],
        limit
      );
      telemetry.persistCompleted(this.collection);
      return sdkOk(docs.map((d) => mapDocumentToDeadLetterRecord(d.data)));
    } catch (error) {
      telemetry.persistFailed('INTERNAL', this.collection);
      return sdkFromError(error);
    }
  }
}

export function createFirestoreDeadLetterAdapter(
  options: FirestoreDeadLetterAdapterOptions
): DeadLetterPort {
  return new FirestoreDeadLetterAdapter(options);
}
