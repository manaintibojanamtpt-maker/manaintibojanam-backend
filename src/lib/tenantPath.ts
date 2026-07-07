import type { TenantInfo } from '../context/TenantContext';
import { RepositoryCache } from './cache/RepositoryCache';

interface ValidatedTenantCacheEntry {
  tenant: TenantInfo;
  validatedAt: string;
}

const TENANT_CACHE_TTL_MS = 5 * 60 * 1000;
const TENANT_CACHE_STALE_MS = 10 * 60 * 1000;

/** In-memory tenant cache — complements sessionStorage validated entries. */
export const tenantRepositoryCache = new RepositoryCache<TenantInfo>({
  ttlMs: TENANT_CACHE_TTL_MS,
  staleWhileRevalidateMs: TENANT_CACHE_STALE_MS,
});

export function parseStorefrontSlug(pathname?: string): string {
  const path = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '');
  const match = path.match(/^\/k\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function parseTenantCacheEntry(raw: string): ValidatedTenantCacheEntry | null {
  const parsed = JSON.parse(raw) as ValidatedTenantCacheEntry | TenantInfo;
  if (parsed && typeof parsed === 'object' && 'validatedAt' in parsed && 'tenant' in parsed) {
    const entry = parsed as ValidatedTenantCacheEntry;
    if (!entry.tenant?.id || !entry.validatedAt) return null;
    return entry;
  }
  return null;
}

/** @deprecated Prefer readValidatedCachedTenant — unvalidated cache must not drive tenant state. */
export function readCachedTenant(slug: string): TenantInfo | null {
  return readValidatedCachedTenant(slug);
}

function readSessionValidatedTenant(slug: string): TenantInfo | null {
  if (!slug || typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`tenant_${slug}`);
    if (!raw) return null;
    const entry = parseTenantCacheEntry(raw);
    return entry?.tenant ?? null;
  } catch {
    return null;
  }
}

/** Returns tenant cache only when a prior Firestore fetch succeeded for this slug. */
export function readValidatedCachedTenant(slug: string): TenantInfo | null {
  if (!slug) return null;

  const memoryHit = tenantRepositoryCache.get(slug);
  if (memoryHit) return memoryHit.value;

  const sessionHit = readSessionValidatedTenant(slug);
  if (sessionHit) {
    tenantRepositoryCache.set(slug, sessionHit);
    return sessionHit;
  }

  return null;
}

export function writeCachedTenant(slug: string, data: TenantInfo): void {
  if (!slug) return;

  tenantRepositoryCache.set(slug, data);

  if (typeof sessionStorage === 'undefined') return;
  try {
    const entry: ValidatedTenantCacheEntry = {
      tenant: data,
      validatedAt: new Date().toISOString(),
    };
    sessionStorage.setItem(`tenant_${slug}`, JSON.stringify(entry));
  } catch {
    // quota / private mode
  }
}

export async function fetchValidatedCachedTenant(
  slug: string,
  fetchFn: () => Promise<TenantInfo | null>,
): Promise<TenantInfo | null> {
  if (!slug) return null;

  const hit = tenantRepositoryCache.get(slug);
  if (hit?.fresh) return hit.value;

  if (hit?.stale) {
    void (async () => {
      try {
        const tenant = await fetchFn();
        if (tenant) writeCachedTenant(slug, tenant);
      } catch {
        // Retain stale tenant on background refresh failure.
      }
    })();
    return hit.value;
  }

  const tenant = await fetchFn();
  if (tenant) writeCachedTenant(slug, tenant);
  return tenant;
}

/** Human-readable label while tenant doc is still loading. */
export function slugToDisplayName(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
