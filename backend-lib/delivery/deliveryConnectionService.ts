import type { Firestore } from 'firebase-admin/firestore';
import { getDeliveryAdapter } from './adapters/index.js';
import {
  DELIVERY_CONNECTION_AUDIT_COLLECTION,
  DELIVERY_CONNECTIONS_COLLECTION,
  DELIVERY_SECRETS_COLLECTION,
  type DeliveryProviderConnectionRecord,
  toPublicConnection,
} from './deliveryProviderConnectionModel.js';
import {
  buildSecretRef,
  decryptDeliveryCredentials,
  encryptDeliveryCredentials,
} from './deliverySecretCrypto.js';
import {
  getProviderCapabilityRow,
  type DeliveryProviderId,
} from './providerCapabilityMatrix.js';

type FieldValueLike = {
  serverTimestamp: () => unknown;
};

export interface DeliveryConnectionServiceDeps {
  readonly db: Firestore;
  readonly fieldValue: FieldValueLike;
}

function connectionsCol(db: Firestore, tenantId: string) {
  return db.collection('tenants').doc(tenantId).collection(DELIVERY_CONNECTIONS_COLLECTION);
}

function secretsCol(db: Firestore, tenantId: string) {
  return db.collection('tenants').doc(tenantId).collection(DELIVERY_SECRETS_COLLECTION);
}

function auditCol(db: Firestore) {
  return db.collection(DELIVERY_CONNECTION_AUDIT_COLLECTION);
}

async function writeAudit(
  deps: DeliveryConnectionServiceDeps,
  entry: Record<string, unknown>,
): Promise<void> {
  await auditCol(deps.db).add({
    ...entry,
    createdAt: deps.fieldValue.serverTimestamp(),
  });
}

function parseRecord(
  tenantId: string,
  provider: DeliveryProviderId,
  data: Record<string, unknown> | undefined,
): DeliveryProviderConnectionRecord | null {
  if (!data) return null;
  const row = getProviderCapabilityRow(provider);
  return {
    tenantId,
    provider,
    connectionType:
      (data.connectionType as DeliveryProviderConnectionRecord['connectionType']) ||
      row?.connectionType ||
      'manual_only',
    status: (data.status as DeliveryProviderConnectionRecord['status']) || 'disconnected',
    merchantAccountId:
      typeof data.merchantAccountId === 'string' ? data.merchantAccountId : undefined,
    providerAccountRef:
      typeof data.providerAccountRef === 'string' ? data.providerAccountRef : undefined,
    secretRef: typeof data.secretRef === 'string' ? data.secretRef : undefined,
    lastValidatedAt: typeof data.lastValidatedAt === 'string' ? data.lastValidatedAt : undefined,
    scopes: Array.isArray(data.scopes) ? data.scopes.map(String) : [],
    capabilities: Array.isArray(data.capabilities)
      ? data.capabilities
      : (row?.capabilities ?? []),
    metadata:
      data.metadata && typeof data.metadata === 'object'
        ? (data.metadata as Record<string, unknown>)
        : {},
    errorMessage: typeof data.errorMessage === 'string' ? data.errorMessage : undefined,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : undefined,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : undefined,
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : undefined,
  };
}

export async function getTenantProviderConnection(
  deps: DeliveryConnectionServiceDeps,
  tenantId: string,
  provider: DeliveryProviderId,
) {
  const snap = await connectionsCol(deps.db, tenantId).doc(provider).get();
  const record = parseRecord(tenantId, provider, snap.data() as Record<string, unknown> | undefined);
  return record ? toPublicConnection(record) : null;
}

export async function listTenantProviderConnections(
  deps: DeliveryConnectionServiceDeps,
  tenantId: string,
) {
  const snap = await connectionsCol(deps.db, tenantId).get();
  const out = [];
  for (const doc of snap.docs) {
    const provider = doc.id as DeliveryProviderId;
    const record = parseRecord(
      tenantId,
      provider,
      doc.data() as Record<string, unknown> | undefined,
    );
    if (record) out.push(toPublicConnection(record));
  }
  return out;
}

export async function startConnection(
  deps: DeliveryConnectionServiceDeps,
  input: {
    readonly tenantId: string;
    readonly provider: DeliveryProviderId;
    readonly actorUid: string;
  },
) {
  const row = getProviderCapabilityRow(input.provider);
  if (!row) throw Object.assign(new Error('Unknown provider'), { statusCode: 400 });
  if (input.provider === 'self_pickup') {
    throw Object.assign(new Error('Self pickup does not require a connection'), {
      statusCode: 400,
    });
  }

  const now = new Date().toISOString();
  const record: DeliveryProviderConnectionRecord = {
    tenantId: input.tenantId,
    provider: input.provider,
    connectionType: row.connectionType,
    status: 'pending',
    scopes: [],
    capabilities: [...row.capabilities],
    metadata: { startedAt: now },
    createdAt: now,
    updatedAt: now,
    createdBy: input.actorUid,
    updatedBy: input.actorUid,
  };

  await connectionsCol(deps.db, input.tenantId).doc(input.provider).set(
    {
      ...record,
      updatedAtServer: deps.fieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await writeAudit(deps, {
    tenantId: input.tenantId,
    provider: input.provider,
    action: 'start_connection',
    actorUid: input.actorUid,
    status: 'pending',
  });

  return toPublicConnection(record);
}

export async function completeConnection(
  deps: DeliveryConnectionServiceDeps,
  input: {
    readonly tenantId: string;
    readonly provider: DeliveryProviderId;
    readonly actorUid: string;
    readonly credentials?: Record<string, string>;
    readonly merchantAccountId?: string;
    readonly metadata?: Record<string, unknown>;
  },
) {
  const row = getProviderCapabilityRow(input.provider);
  if (!row) throw Object.assign(new Error('Unknown provider'), { statusCode: 400 });

  const adapter = getDeliveryAdapter(input.provider);
  const now = new Date().toISOString();
  let secretRef: string | undefined;
  let status: DeliveryProviderConnectionRecord['status'] = 'connected';
  let errorMessage: string | undefined;
  let merchantAccountId = input.merchantAccountId?.trim() || undefined;
  let lastValidatedAt: string | undefined;

  if (row.connectionType === 'manual_only') {
    status = 'connected';
    lastValidatedAt = now;
  } else {
    const credentials = input.credentials ?? {};
    for (const field of row.requiredCredentialFields) {
      if (!credentials[field]?.trim()) {
        throw Object.assign(new Error(`Missing credential field: ${field}`), {
          statusCode: 400,
        });
      }
    }

    if (adapter) {
      const validated = await adapter.validateCredentials(credentials);
      if (!validated.ok) {
        status = 'error';
        errorMessage = validated.message;
      } else {
        merchantAccountId = validated.merchantAccountId || merchantAccountId;
        lastValidatedAt = now;
      }
    }

    if (status !== 'error') {
      const encrypted = encryptDeliveryCredentials(credentials);
      secretRef = buildSecretRef(input.tenantId, input.provider);
      await secretsCol(deps.db, input.tenantId).doc(input.provider).set({
        secretRef,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        algorithm: encrypted.algorithm,
        createdAt: now,
        updatedAt: now,
        updatedBy: input.actorUid,
      });
    }
  }

  const record: DeliveryProviderConnectionRecord = {
    tenantId: input.tenantId,
    provider: input.provider,
    connectionType: row.connectionType,
    status,
    ...(merchantAccountId ? { merchantAccountId } : {}),
    ...(secretRef ? { secretRef } : {}),
    ...(lastValidatedAt ? { lastValidatedAt } : {}),
    scopes: row.id === 'uber_direct' ? ['eats.deliveries'] : [],
    capabilities: [...row.capabilities],
    metadata: { ...(input.metadata ?? {}), completedAt: now },
    ...(errorMessage ? { errorMessage } : {}),
    updatedAt: now,
    updatedBy: input.actorUid,
  };

  await connectionsCol(deps.db, input.tenantId).doc(input.provider).set(
    {
      ...record,
      updatedAtServer: deps.fieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await writeAudit(deps, {
    tenantId: input.tenantId,
    provider: input.provider,
    action: 'complete_connection',
    actorUid: input.actorUid,
    status,
    ...(errorMessage ? { errorMessage } : {}),
  });

  return toPublicConnection(record);
}

export async function validateConnection(
  deps: DeliveryConnectionServiceDeps,
  input: {
    readonly tenantId: string;
    readonly provider: DeliveryProviderId;
    readonly actorUid: string;
  },
) {
  const snap = await connectionsCol(deps.db, input.tenantId).doc(input.provider).get();
  const existing = parseRecord(
    input.tenantId,
    input.provider,
    snap.data() as Record<string, unknown> | undefined,
  );
  if (!existing) {
    throw Object.assign(new Error('Connection not found'), { statusCode: 404 });
  }

  const adapter = getDeliveryAdapter(input.provider);
  const row = getProviderCapabilityRow(input.provider);
  const now = new Date().toISOString();

  if (!adapter || row?.connectionType === 'manual_only') {
    await connectionsCol(deps.db, input.tenantId).doc(input.provider).set(
      {
        status: 'connected',
        lastValidatedAt: now,
        errorMessage: null,
        updatedAt: now,
        updatedBy: input.actorUid,
      },
      { merge: true },
    );
    await writeAudit(deps, {
      tenantId: input.tenantId,
      provider: input.provider,
      action: 'validate_connection',
      actorUid: input.actorUid,
      status: 'connected',
    });
    return toPublicConnection({
      ...existing,
      status: 'connected',
      lastValidatedAt: now,
      errorMessage: undefined,
      updatedAt: now,
    });
  }

  const secretSnap = await secretsCol(deps.db, input.tenantId).doc(input.provider).get();
  const secret = secretSnap.data();
  if (!secret?.ciphertext || !secret?.iv) {
    throw Object.assign(new Error('No stored credentials to validate'), { statusCode: 400 });
  }
  const credentials = decryptDeliveryCredentials({
    ciphertext: String(secret.ciphertext),
    iv: String(secret.iv),
  });
  const validated = await adapter.validateCredentials(credentials);
  const status = validated.ok ? 'connected' : 'error';

  await connectionsCol(deps.db, input.tenantId).doc(input.provider).set(
    {
      status,
      lastValidatedAt: validated.ok ? now : existing.lastValidatedAt ?? null,
      errorMessage: validated.ok ? null : validated.message,
      ...(validated.merchantAccountId
        ? { merchantAccountId: validated.merchantAccountId }
        : {}),
      updatedAt: now,
      updatedBy: input.actorUid,
    },
    { merge: true },
  );
  await writeAudit(deps, {
    tenantId: input.tenantId,
    provider: input.provider,
    action: 'validate_connection',
    actorUid: input.actorUid,
    status,
    ...(validated.ok ? {} : { errorMessage: validated.message }),
  });

  return toPublicConnection({
    ...existing,
    status,
    lastValidatedAt: validated.ok ? now : existing.lastValidatedAt,
    errorMessage: validated.ok ? undefined : validated.message,
    merchantAccountId: validated.merchantAccountId || existing.merchantAccountId,
    updatedAt: now,
  });
}

export async function revokeConnection(
  deps: DeliveryConnectionServiceDeps,
  input: {
    readonly tenantId: string;
    readonly provider: DeliveryProviderId;
    readonly actorUid: string;
  },
) {
  const now = new Date().toISOString();
  await secretsCol(deps.db, input.tenantId).doc(input.provider).delete().catch(() => undefined);
  await connectionsCol(deps.db, input.tenantId).doc(input.provider).set(
    {
      status: 'disconnected',
      secretRef: null,
      errorMessage: null,
      lastValidatedAt: null,
      updatedAt: now,
      updatedBy: input.actorUid,
      revokedAt: now,
    },
    { merge: true },
  );
  await writeAudit(deps, {
    tenantId: input.tenantId,
    provider: input.provider,
    action: 'revoke_connection',
    actorUid: input.actorUid,
    status: 'disconnected',
  });

  const publicConn = await getTenantProviderConnection(deps, input.tenantId, input.provider);
  return publicConn;
}

/** Load decrypted credentials for server-side dispatch only. */
export async function loadTenantProviderCredentials(
  deps: DeliveryConnectionServiceDeps,
  tenantId: string,
  provider: DeliveryProviderId,
): Promise<{
  connection: DeliveryProviderConnectionRecord;
  credentials: Record<string, string>;
} | null> {
  const snap = await connectionsCol(deps.db, tenantId).doc(provider).get();
  const connection = parseRecord(
    tenantId,
    provider,
    snap.data() as Record<string, unknown> | undefined,
  );
  if (!connection || connection.status !== 'connected') return null;

  if (connection.connectionType === 'manual_only') {
    return { connection, credentials: {} };
  }

  const secretSnap = await secretsCol(deps.db, tenantId).doc(provider).get();
  const secret = secretSnap.data();
  if (!secret?.ciphertext || !secret?.iv) return null;
  const credentials = decryptDeliveryCredentials({
    ciphertext: String(secret.ciphertext),
    iv: String(secret.iv),
  });
  return { connection, credentials };
}
