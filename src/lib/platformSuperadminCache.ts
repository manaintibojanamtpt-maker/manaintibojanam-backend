/**
 * Session SWR cache for BhojanOS Super Admin — paint instantly on revisit.
 */

export type SuperadminTenantRow = {
  id: string;
  name?: string;
  slug?: string;
  plan?: string;
  status?: string;
  ownerUid?: string;
  ownerEmail?: string;
  createdAt?: string;
  updatedAt?: string;
  analytics?: {
    ordersToday?: number;
    revenueToday?: number;
    activeSubscriptions?: number;
    churnRisk?: number;
  };
  kyc?: {
    status?: string;
    submittedAt?: string;
    reviewedAt?: string;
    notes?: string;
  };
  [key: string]: unknown;
};

export type SuperadminCachePayload = {
  tenants: SuperadminTenantRow[];
  firebaseProjectId?: string | null;
  dataSource?: string | null;
  fetchedAt: number;
};

const STORAGE_KEY = 'bhojanos.superadmin.session.v1';
const MEMORY_TTL_MS = 45_000;
const SESSION_TTL_MS = 10 * 60_000;

let memory: SuperadminCachePayload | null = null;

function canUseSession(): boolean {
  try {
    return typeof sessionStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function readSuperadminCache(): SuperadminCachePayload | null {
  if (memory && Date.now() - memory.fetchedAt < MEMORY_TTL_MS) {
    return memory;
  }
  if (!canUseSession()) return memory;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return memory;
    const parsed = JSON.parse(raw) as SuperadminCachePayload;
    if (!parsed?.tenants || !Array.isArray(parsed.tenants) || !parsed.fetchedAt) return memory;
    if (Date.now() - parsed.fetchedAt > SESSION_TTL_MS) return memory;
    memory = parsed;
    return parsed;
  } catch {
    return memory;
  }
}

export function writeSuperadminCache(payload: Omit<SuperadminCachePayload, 'fetchedAt'>): SuperadminCachePayload {
  const next: SuperadminCachePayload = {
    ...payload,
    fetchedAt: Date.now(),
  };
  memory = next;
  if (canUseSession()) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* quota */
    }
  }
  return next;
}

export function patchSuperadminTenants(
  mutator: (tenants: SuperadminTenantRow[]) => SuperadminTenantRow[],
): SuperadminCachePayload | null {
  const current = readSuperadminCache();
  if (!current) return null;
  return writeSuperadminCache({
    tenants: mutator(current.tenants),
    firebaseProjectId: current.firebaseProjectId,
    dataSource: current.dataSource,
  });
}

export function clearSuperadminCache(): void {
  memory = null;
  if (canUseSession()) {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}
