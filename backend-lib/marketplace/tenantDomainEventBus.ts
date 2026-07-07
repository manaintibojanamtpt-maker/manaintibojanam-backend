import { randomUUID } from 'node:crypto';
import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import type {
  TenantDomainEvent,
  TenantDomainEventType,
} from '../domain/TenantDomainEventTypes.js';
import { createTenantDomainEvent } from '../domain/TenantDomainEventTypes.js';
import type { TenantSyncResult } from './tenantSyncService.js';

const DOMAIN_EVENTS = 'tenant_domain_events';

export type TenantDomainEventHandler = (
  db: Firestore,
  fieldValue: typeof FieldValue,
  event: TenantDomainEvent,
) => Promise<TenantSyncResult | void>;

const handlers = new Map<TenantDomainEventType | '*', TenantDomainEventHandler[]>();

export function subscribeTenantDomainEvent(
  eventType: TenantDomainEventType | '*',
  handler: TenantDomainEventHandler,
): () => void {
  const list = handlers.get(eventType) ?? [];
  list.push(handler);
  handlers.set(eventType, list);
  return () => {
    const current = handlers.get(eventType) ?? [];
    handlers.set(
      eventType,
      current.filter((entry) => entry !== handler),
    );
  };
}

function handlersFor(event: TenantDomainEvent): TenantDomainEventHandler[] {
  const specific = handlers.get(event.type) ?? [];
  const wildcard = handlers.get('*') ?? [];
  return [...specific, ...wildcard];
}

async function persistDomainEvent(
  db: Firestore,
  fieldValue: typeof FieldValue,
  event: TenantDomainEvent,
): Promise<void> {
  await db.collection(DOMAIN_EVENTS).doc(event.eventId).set({
    eventId: event.eventId,
    type: event.type,
    version: event.version,
    occurredAt: event.occurredAt,
    tenantId: event.payload.tenantId,
    source: event.payload.source,
    aggregateType: event.payload.aggregateType,
    aggregateId: event.payload.aggregateId,
    payload: event.payload,
    createdAt: fieldValue.serverTimestamp(),
  });
}

export async function publishTenantDomainEvent(
  db: Firestore,
  fieldValue: typeof FieldValue,
  input: {
    tenantId: string;
    type: TenantDomainEventType;
    source: string;
    eventId?: string;
  },
): Promise<TenantSyncResult> {
  const event = createTenantDomainEvent({
    type: input.type,
    tenantId: input.tenantId,
    source: input.source,
    eventId: input.eventId ?? randomUUID(),
  });

  await persistDomainEvent(db, fieldValue, event);

  let lastResult: TenantSyncResult | undefined;
  for (const handler of handlersFor(event)) {
    const result = await handler(db, fieldValue, event);
    if (result) lastResult = result;
  }

  if (!lastResult) {
    throw new Error(`No tenant domain event handler registered for ${event.type}`);
  }

  return lastResult;
}
