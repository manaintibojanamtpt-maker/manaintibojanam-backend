import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import { mergeSyncRevisions } from './tenantProjectionHelpers.js';
import {
  countTenantMenuItems,
  removeTenantDiscoveryProfile,
  writeTenantDiscoveryProfile,
} from './discoveryProfileWriter.js';
import { publishTenantDomainEvent } from './tenantDomainEventBus.js';
import { syncTenantGeoIndexEntry } from './geoIndexWriter.js';
import { inferTenantEventTypeFromLegacySource } from '../domain/TenantDomainEventTypes.js';

const SYNC_EVENTS = 'marketplace_sync_events';
const META_DOC = 'marketplace_meta/global';

export interface TenantSyncResult {
  readonly tenantId: string;
  readonly tenantSyncRevision: string;
  readonly poolSyncRevision: string;
  readonly source: string;
  readonly eventType?: string;
}

/** Core marketplace projection sync — invoked by domain event subscribers only. */
export async function runTenantMarketplaceSync(
  db: Firestore,
  tenantId: string,
  fieldValue: typeof FieldValue,
  eventType: string,
  source: string,
): Promise<TenantSyncResult> {
  const tenantDoc = await db.collection('tenants').doc(tenantId).get();
  if (!tenantDoc.exists) {
    await removeTenantDiscoveryProfile(db, tenantId);
    const revision = new Date().toISOString();
    await bumpPoolSyncRevision(db, fieldValue, revision);
    return { tenantId, tenantSyncRevision: revision, poolSyncRevision: revision, source };
  }

  const raw = tenantDoc.data() as Record<string, unknown>;
  const tenantSlug = typeof raw.slug === 'string' ? raw.slug : undefined;
  const menuCount = await countTenantMenuItems(db, tenantId, tenantSlug);
  const profile = await writeTenantDiscoveryProfile(db, tenantId, raw, menuCount);
  await syncTenantGeoIndexEntry(db, fieldValue, tenantId, raw);

  const tenantSyncRevision = mergeSyncRevisions(
    profile.syncRevision,
    new Date().toISOString(),
  )!;

  await db.collection('tenants').doc(tenantId).set(
    {
      tenantSyncRevision,
      discoveryProfileUpdatedAt: fieldValue.serverTimestamp(),
      updatedAt: fieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const poolSyncRevision = await bumpPoolSyncRevision(db, fieldValue, tenantSyncRevision);

  await db.collection(SYNC_EVENTS).add({
    tenantId,
    source,
    eventType,
    tenantSyncRevision,
    poolSyncRevision,
    createdAt: fieldValue.serverTimestamp(),
  });

  return { tenantId, tenantSyncRevision, poolSyncRevision, source, eventType };
}

/** @deprecated Prefer publishTenantDomainEvent — kept for transitional callers. */
export async function emitTenantSync(
  db: Firestore,
  tenantId: string,
  fieldValue: typeof FieldValue,
  source: string,
): Promise<TenantSyncResult> {
  return publishTenantDomainEvent(db, fieldValue, {
    tenantId,
    type: inferTenantEventTypeFromLegacySource(source),
    source,
  });
}

async function bumpPoolSyncRevision(
  db: Firestore,
  fieldValue: typeof FieldValue,
  candidateRevision: string,
): Promise<string> {
  const metaRef = db.collection('marketplace_meta').doc('global');
  const metaSnap = await metaRef.get();
  const existing =
    metaSnap.exists && typeof metaSnap.data()?.poolSyncRevision === 'string'
      ? String(metaSnap.data()?.poolSyncRevision)
      : undefined;
  const poolSyncRevision = mergeSyncRevisions(existing, candidateRevision) ?? candidateRevision;
  await metaRef.set(
    {
      poolSyncRevision,
      updatedAt: fieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return poolSyncRevision;
}

export async function readPoolSyncRevision(db: Firestore): Promise<string | undefined> {
  const metaSnap = await db.collection('marketplace_meta').doc('global').get();
  if (!metaSnap.exists) return undefined;
  const revision = metaSnap.data()?.poolSyncRevision;
  return typeof revision === 'string' ? revision : undefined;
}

export async function readTenantSyncRevision(
  db: Firestore,
  tenantId: string,
): Promise<string | undefined> {
  const doc = await db.collection('tenants').doc(tenantId).get();
  if (!doc.exists) return undefined;
  const raw = doc.data() as Record<string, unknown>;
  if (typeof raw.tenantSyncRevision === 'string') return raw.tenantSyncRevision;
  return undefined;
}

/** @deprecated Use emitTenantSync */
export async function refreshDiscoveryProfileAfterTenantWrite(
  db: Firestore,
  tenantId: string,
  fieldValue: typeof FieldValue,
): Promise<void> {
  await emitTenantSync(db, tenantId, fieldValue, 'legacy_refresh');
}
