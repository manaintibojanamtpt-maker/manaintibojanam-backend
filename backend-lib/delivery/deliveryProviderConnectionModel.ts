import type {
  DeliveryCapability,
  DeliveryConnectionType,
  DeliveryProviderId,
} from './providerCapabilityMatrix.js';

export type DeliveryConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'pending'
  | 'error';

/** Public metadata — safe to return to owner UI (no secrets). */
export interface DeliveryProviderConnectionPublic {
  readonly tenantId: string;
  readonly provider: DeliveryProviderId;
  readonly connectionType: DeliveryConnectionType;
  readonly status: DeliveryConnectionStatus;
  readonly merchantAccountId?: string;
  readonly providerAccountRef?: string;
  readonly lastValidatedAt?: string;
  readonly scopes: readonly string[];
  readonly capabilities: readonly DeliveryCapability[];
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly hasSecretRef: boolean;
  readonly errorMessage?: string;
  readonly updatedAt?: string;
}

/** Server-only secret envelope — never returned to clients. */
export interface DeliveryProviderSecretEnvelope {
  readonly secretRef: string;
  /** AES-GCM ciphertext (base64) of JSON credential payload. */
  readonly ciphertext: string;
  readonly iv: string;
  readonly algorithm: 'aes-256-gcm';
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DeliveryProviderConnectionRecord {
  readonly tenantId: string;
  readonly provider: DeliveryProviderId;
  readonly connectionType: DeliveryConnectionType;
  readonly status: DeliveryConnectionStatus;
  readonly merchantAccountId?: string;
  readonly providerAccountRef?: string;
  readonly secretRef?: string;
  readonly lastValidatedAt?: string;
  readonly scopes: readonly string[];
  readonly capabilities: readonly DeliveryCapability[];
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly errorMessage?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
}

export function toPublicConnection(
  record: DeliveryProviderConnectionRecord,
): DeliveryProviderConnectionPublic {
  return {
    tenantId: record.tenantId,
    provider: record.provider,
    connectionType: record.connectionType,
    status: record.status,
    ...(record.merchantAccountId ? { merchantAccountId: record.merchantAccountId } : {}),
    ...(record.providerAccountRef ? { providerAccountRef: record.providerAccountRef } : {}),
    ...(record.lastValidatedAt ? { lastValidatedAt: record.lastValidatedAt } : {}),
    scopes: record.scopes,
    capabilities: record.capabilities,
    metadata: record.metadata,
    hasSecretRef: Boolean(record.secretRef),
    ...(record.errorMessage ? { errorMessage: record.errorMessage } : {}),
    ...(record.updatedAt ? { updatedAt: record.updatedAt } : {}),
  };
}

export const DELIVERY_CONNECTIONS_COLLECTION = 'deliveryProviderConnections';
export const DELIVERY_SECRETS_COLLECTION = 'deliveryProviderSecrets';
export const DELIVERY_CONNECTION_AUDIT_COLLECTION = 'deliveryConnectionAudit';
