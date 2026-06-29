import { EnvironmentConfig } from '../config/environment';

const OWNER_DASHBOARD = '/owner/dashboard';
const TENANT_CACHE_KEY = 'bhojanos_owner_tenant_ids';

export function cacheOwnerTenantIds(ids: string[]): void {
  if (typeof sessionStorage === 'undefined' || ids.length === 0) return;
  try {
    sessionStorage.setItem(TENANT_CACHE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore quota */
  }
}

export function readCachedOwnerTenantIds(): string[] {
  if (typeof sessionStorage === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(TENANT_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

/** Immediate full-page redirect — never block on API/Firestore during login. */
export function redirectToOwnerDashboard(): void {
  const url = `${EnvironmentConfig.getBaseUrl()}${OWNER_DASHBOARD}`;
  window.location.assign(url);
}

export function getOwnerDashboardPath(): string {
  return OWNER_DASHBOARD;
}
