import { FOUNDER_TENANT_ID, isFounderOwnerEmail } from '../config/founder';

export const OWNER_ACTIVE_TENANT_KEY = 'owner_active_tenant_id';

export function readOwnerActiveTenantId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = sessionStorage.getItem(OWNER_ACTIVE_TENANT_KEY);
    return value?.trim() || null;
  } catch {
    return null;
  }
}

export function writeOwnerActiveTenantId(tenantId: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(OWNER_ACTIVE_TENANT_KEY, tenantId);
  } catch {
    /* ignore quota errors */
  }
}

/** Pick which kitchen the owner portal should load when the user owns multiple stores. */
export function resolvePreferredOwnerTenantId(
  ownedTenantIds: string[] | undefined,
  email?: string | null,
): string | null {
  const owned = (ownedTenantIds ?? []).filter(
    (id) => Boolean(id) && (id !== FOUNDER_TENANT_ID || isFounderOwnerEmail(email)),
  );
  if (owned.length === 0) return null;

  const active = readOwnerActiveTenantId();
  if (active && owned.includes(active)) return active;

  if (isFounderOwnerEmail(email) && owned.includes(FOUNDER_TENANT_ID)) {
    return FOUNDER_TENANT_ID;
  }

  return owned[0];
}
