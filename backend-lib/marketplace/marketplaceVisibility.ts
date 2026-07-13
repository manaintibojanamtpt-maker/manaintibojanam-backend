function isPublishedStoreStatus(storeStatus: unknown): boolean {
  return storeStatus === 'published' || storeStatus === 'live' || storeStatus === 'active';
}

function isUatOrSandboxTenant(data: Record<string, unknown>, tenantId?: string): boolean {
  if (data.sandboxMode === true) return true;
  const slug = typeof data.slug === 'string' ? data.slug.toLowerCase() : '';
  const id = (tenantId ?? (typeof data.id === 'string' ? data.id : '')).toLowerCase();
  return slug.startsWith('uat-') || id.startsWith('uat-') || slug.includes('sandbox') || id.includes('sandbox');
}

/** Single visibility rule for marketplace discovery — owner, API, and SDK must align. */
export function isMarketplaceVisibleTenant(data: Record<string, unknown>): boolean {
  const status = typeof data.status === 'string' ? data.status.toLowerCase() : '';
  if (status === 'suspended' || status === 'rejected') return false;
  if (data.sandboxMode === true) return true;
  return isPublishedStoreStatus(data.storeStatus);
}

export function isActiveTenantStatus(data: Record<string, unknown>): boolean {
  const status = typeof data.status === 'string' ? data.status.toLowerCase() : '';
  return status === '' || status === 'active' || status === 'trialing';
}

export function isMarketplaceEligibleTenant(data: Record<string, unknown>): boolean {
  return isActiveTenantStatus(data) && isMarketplaceVisibleTenant(data);
}

/** Consumer storefront — published, active tenants only (no sandbox/demo kitchens). */
export function isConsumerListedTenant(data: Record<string, unknown>, tenantId?: string): boolean {
  if (!isActiveTenantStatus(data)) return false;
  const status = typeof data.status === 'string' ? data.status.toLowerCase() : '';
  if (status === 'suspended' || status === 'rejected') return false;
  if (isUatOrSandboxTenant(data, tenantId)) return false;
  return isPublishedStoreStatus(data.storeStatus);
}
