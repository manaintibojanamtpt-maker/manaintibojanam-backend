import type { TenantInfo } from '../context/TenantContext';

export function parseStorefrontSlug(pathname?: string): string {
  const path = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '');
  const match = path.match(/^\/k\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export function readCachedTenant(slug: string): TenantInfo | null {
  if (!slug || typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`tenant_${slug}`);
    if (!raw) return null;
    const data = JSON.parse(raw) as TenantInfo;
    if (!data?.id) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeCachedTenant(slug: string, data: TenantInfo): void {
  if (!slug || typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(`tenant_${slug}`, JSON.stringify(data));
  } catch {
    // quota / private mode
  }
}

/** Human-readable label while tenant doc is still loading. */
export function slugToDisplayName(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
