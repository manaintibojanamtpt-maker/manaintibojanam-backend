/**
 * EventSDK — Firestore idempotency adapter (M6 PR-3).
 * Implements IdempotencyStorePort — no contract changes.
 */

import type { IdempotencyStorePort } from '../contracts/ports';
import type { ClockPort } from '../contracts/ports';
import type { SdkAsyncResult } from '../../core/result';
import { sdkFromError, sdkOk } from '../../core/resultHelpers';
import type { FirestorePersistencePort } from './FirestorePersistencePort';
import type { EventPersistenceCollectionNames } from './collectionNames';
import { DEFAULT_EVENT_PERSISTENCE_COLLECTIONS } from './collectionNames';
import {
  isIdempotencyExpired,
  mapDocumentToIdempotency,
  mapIdempotencyToDocument,
} from './mappers/idempotencyMapper';
import type { EventPersistenceTelemetryHook } from './PersistenceTelemetry';
import { createPersistenceTelemetryEmitter } from './PersistenceTelemetry';

/** Default TTL: 24 hours — metadata only, no cleanup job in PR-3 */
export const DEFAULT_FIRESTORE_IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export interface FirestoreIdempotencyAdapterOptions {
  readonly persistence: FirestorePersistencePort;
  readonly clock: ClockPort;
  readonly collections?: Partial<EventPersistenceCollectionNames>;
  readonly ttlMs?: number;
  readonly onTelemetry?: EventPersistenceTelemetryHook;
}

export class FirestoreIdempotencyAdapter implements IdempotencyStorePort {
  private readonly collection: string;
  private readonly ttlMs: number;

  constructor(private readonly options: FirestoreIdempotencyAdapterOptions) {
    this.collection =
      options.collections?.idempotency ?? DEFAULT_EVENT_PERSISTENCE_COLLECTIONS.idempotency;
    this.ttlMs = options.ttlMs ?? DEFAULT_FIRESTORE_IDEMPOTENCY_TTL_MS;
  }

  async has(key: string): SdkAsyncResult<boolean> {
    const telemetry = createPersistenceTelemetryEmitter(this.options.onTelemetry, 'has');
    try {
      telemetry.persistStarted(this.collection, key);
      const doc = await this.options.persistence.get(this.collection, key);
      if (!doc) {
        telemetry.persistCompleted(this.collection, key);
        return sdkOk(false);
      }
      const record = mapDocumentToIdempotency(doc.data);
      const expired = isIdempotencyExpired(record, this.options.clock.now());
      telemetry.persistCompleted(this.collection, key);
      return sdkOk(!expired);
    } catch (error) {
      telemetry.persistFailed('INTERNAL', this.collection);
      return sdkFromError(error);
    }
  }

  async mark(key: string, eventId: string): SdkAsyncResult<void> {
    const telemetry = createPersistenceTelemetryEmitter(this.options.onTelemetry, 'mark');
    try {
      telemetry.persistStarted(this.collection, key);
      const recordedAt = this.options.clock.now();
      const expiresAt = new Date(new Date(recordedAt).getTime() + this.ttlMs).toISOString();
      const data = mapIdempotencyToDocument(key, eventId, recordedAt, expiresAt);
      await this.options.persistence.set(this.collection, key, data);
      telemetry.persistCompleted(this.collection, key);
      return sdkOk(undefined);
    } catch (error) {
      telemetry.persistFailed('INTERNAL', this.collection);
      return sdkFromError(error);
    }
  }
}

export function createFirestoreIdempotencyAdapter(
  options: FirestoreIdempotencyAdapterOptions
): IdempotencyStorePort {
  return new FirestoreIdempotencyAdapter(options);
}
