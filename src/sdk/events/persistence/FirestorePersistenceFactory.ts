/**
 * EventSDK — Firestore persistence factory (M6 PR-3).
 * Provider-neutral — Firestore is first adapter only.
 */

import type { OutboxRepositoryPort, EventStorePort, DeadLetterPort, IdempotencyStorePort } from '../contracts/ports';
import type { EventPublisherPort } from '../contracts/ports';
import type { ClockPort, UuidPort } from '../contracts/ports';
import type { ExtendedEventStorePort } from '../contracts/infrastructurePorts';
import type { ExtendedOutboxRepositoryPort } from '../contracts/infrastructurePorts';
import {
  readEventFlagDefault,
  type EventFeatureFlagReader,
} from '../core/featureFlags';
import type { FirestorePersistencePort } from './FirestorePersistencePort';
import type { EventPersistenceCollectionNames } from './collectionNames';
import { createFirestoreOutboxPersistenceAdapter } from './FirestoreOutboxPersistenceAdapter';
import { createFirestoreEventStoreAdapter } from './FirestoreEventStoreAdapter';
import { createFirestoreDeadLetterAdapter } from './FirestoreDeadLetterAdapter';
import { createFirestoreIdempotencyAdapter } from './FirestoreIdempotencyAdapter';
import { createShadowPublisher } from './ShadowPublisher';
import { createDefaultClock } from '../providers/DefaultClock';
import { createDefaultUuid } from '../providers/DefaultUuid';
import { createStubOutboxRepository } from '../repository/StubOutboxRepository';
import { createStubEventPublisher } from '../providers/StubEventPublisher';
import type { EventPersistenceTelemetryHook } from './PersistenceTelemetry';

export interface FirestorePersistenceFactoryOptions {
  readonly featureFlags?: EventFeatureFlagReader;
  readonly persistence?: FirestorePersistencePort;
  readonly clock?: ClockPort;
  readonly uuid?: UuidPort;
  readonly collections?: Partial<EventPersistenceCollectionNames>;
  readonly onTelemetry?: EventPersistenceTelemetryHook;
  readonly idempotencyTtlMs?: number;
}

function isPersistenceEnabled(readFlag: EventFeatureFlagReader): boolean {
  return readFlag('FF_EVENT_PLATFORM_ENABLED') && readFlag('FF_EVENT_OUTBOX_ENABLED');
}

function requirePersistence(
  options: FirestorePersistenceFactoryOptions
): FirestorePersistencePort | null {
  const readFlag = options.featureFlags ?? readEventFlagDefault;
  if (!isPersistenceEnabled(readFlag) || !options.persistence) {
    return null;
  }
  return options.persistence;
}

export function createFirestoreOutboxPersistence(
  options: FirestorePersistenceFactoryOptions = {}
): OutboxRepositoryPort {
  const persistence = requirePersistence(options);
  if (!persistence) {
    return createStubOutboxRepository();
  }

  return createFirestoreOutboxPersistenceAdapter({
    persistence,
    clock: options.clock ?? createDefaultClock(),
    uuid: options.uuid ?? createDefaultUuid(),
    collections: options.collections,
    onTelemetry: options.onTelemetry,
  });
}

export function createFirestoreEventStore(
  options: FirestorePersistenceFactoryOptions = {}
): EventStorePort {
  const persistence = requirePersistence(options);
  if (!persistence) {
    return {
      append: () => Promise.resolve({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'Event store not configured' } }),
      read: () => Promise.resolve({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'Event store not configured' } }),
    };
  }

  return createFirestoreEventStoreAdapter({
    persistence,
    clock: options.clock ?? createDefaultClock(),
    collections: options.collections,
    onTelemetry: options.onTelemetry,
  });
}

export function createFirestoreDeadLetterStore(
  options: FirestorePersistenceFactoryOptions = {}
): DeadLetterPort {
  const persistence = requirePersistence(options);
  if (!persistence) {
    return {
      record: () => Promise.resolve({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'Dead letter store not configured' } }),
      list: () => Promise.resolve({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'Dead letter store not configured' } }),
    };
  }

  return createFirestoreDeadLetterAdapter({
    persistence,
    clock: options.clock ?? createDefaultClock(),
    uuid: options.uuid ?? createDefaultUuid(),
    collections: options.collections,
    onTelemetry: options.onTelemetry,
  });
}

export function createFirestoreIdempotencyStore(
  options: FirestorePersistenceFactoryOptions = {}
): IdempotencyStorePort {
  const persistence = requirePersistence(options);
  if (!persistence) {
    return {
      has: () => Promise.resolve({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'Idempotency store not configured' } }),
      mark: () => Promise.resolve({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'Idempotency store not configured' } }),
    };
  }

  return createFirestoreIdempotencyAdapter({
    persistence,
    clock: options.clock ?? createDefaultClock(),
    collections: options.collections,
    ttlMs: options.idempotencyTtlMs,
    onTelemetry: options.onTelemetry,
  });
}

export interface CreateShadowPublisherFactoryOptions extends FirestorePersistenceFactoryOptions {
  readonly outboxRepository?: OutboxRepositoryPort;
  readonly idempotencyStore?: IdempotencyStorePort;
}

export function createShadowPublisherFactory(
  options: CreateShadowPublisherFactoryOptions = {}
): EventPublisherPort {
  const readFlag = options.featureFlags ?? readEventFlagDefault;

  if (
    !readFlag('FF_EVENT_PLATFORM_ENABLED') ||
    !readFlag('FF_EVENT_OUTBOX_ENABLED') ||
    !readFlag('FF_EVENT_SHADOW_PUBLISHING_ENABLED')
  ) {
    return createStubEventPublisher();
  }

  const persistence = options.persistence;
  const clock = options.clock ?? createDefaultClock();
  const uuid = options.uuid ?? createDefaultUuid();

  const outboxRepository =
    options.outboxRepository ??
    (persistence
      ? createFirestoreOutboxPersistenceAdapter({
          persistence,
          clock,
          uuid,
          collections: options.collections,
          onTelemetry: options.onTelemetry,
        })
      : null);

  if (!outboxRepository) {
    return createStubEventPublisher();
  }

  const idempotencyStore =
    options.idempotencyStore ??
    (persistence
      ? createFirestoreIdempotencyAdapter({
          persistence,
          clock,
          collections: options.collections,
          ttlMs: options.idempotencyTtlMs,
          onTelemetry: options.onTelemetry,
        })
      : undefined);

  return createShadowPublisher({
    featureFlags: readFlag,
    outboxRepository,
    idempotencyStore,
    clock,
    uuid,
    onTelemetry: options.onTelemetry,
  });
}

/** Alias per spec */
export { createShadowPublisherFactory as createShadowPublisher };

export interface FirestorePersistenceBundle {
  readonly outbox: ExtendedOutboxRepositoryPort;
  readonly eventStore: ExtendedEventStorePort;
  readonly deadLetter: DeadLetterPort;
  readonly idempotency: IdempotencyStorePort;
  readonly shadowPublisher: EventPublisherPort;
}

export function createFirestorePersistenceBundle(
  options: FirestorePersistenceFactoryOptions & { persistence: FirestorePersistencePort }
): FirestorePersistenceBundle {
  const clock = options.clock ?? createDefaultClock();
  const uuid = options.uuid ?? createDefaultUuid();

  return {
    outbox: createFirestoreOutboxPersistenceAdapter({
      persistence: options.persistence,
      clock,
      uuid,
      collections: options.collections,
      onTelemetry: options.onTelemetry,
    }),
    eventStore: createFirestoreEventStoreAdapter({
      persistence: options.persistence,
      clock,
      collections: options.collections,
      onTelemetry: options.onTelemetry,
    }),
    deadLetter: createFirestoreDeadLetterAdapter({
      persistence: options.persistence,
      clock,
      uuid,
      collections: options.collections,
      onTelemetry: options.onTelemetry,
    }),
    idempotency: createFirestoreIdempotencyAdapter({
      persistence: options.persistence,
      clock,
      collections: options.collections,
      ttlMs: options.idempotencyTtlMs,
      onTelemetry: options.onTelemetry,
    }),
    shadowPublisher: createShadowPublisher({
      featureFlags: options.featureFlags ?? readEventFlagDefault,
      outboxRepository: createFirestoreOutboxPersistenceAdapter({
        persistence: options.persistence,
        clock,
        uuid,
        collections: options.collections,
        onTelemetry: options.onTelemetry,
      }),
      idempotencyStore: createFirestoreIdempotencyAdapter({
        persistence: options.persistence,
        clock,
        collections: options.collections,
        ttlMs: options.idempotencyTtlMs,
        onTelemetry: options.onTelemetry,
      }),
      clock,
      uuid,
      onTelemetry: options.onTelemetry,
    }),
  };
}
