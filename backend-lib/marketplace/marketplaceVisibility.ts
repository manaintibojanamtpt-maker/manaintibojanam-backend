/** Single visibility rule for marketplace discovery — owner, API, and SDK must align. */
export function isMarketplaceVisibleTenant(data: Record<string, unknown>): boolean {
  const status = typeof data.status === 'string' ? data.status.toLowerCase() : '';
  if (status === 'suspended' || status === 'rejected') return false;
  if (data.sandboxMode === true) return true;
  return data.storeStatus === 'published';
}

export function isActiveTenantStatus(data: Record<string, unknown>): boolean {
  const status = typeof data.status === 'string' ? data.status.toLowerCase() : '';
  return status === '' || status === 'active' || status === 'trialing';
}

export function isMarketplaceEligibleTenant(data: Record<string, unknown>): boolean {
  return isActiveTenantStatus(data) && isMarketplaceVisibleTenant(data);
}

/** Consumer storefront — published, active tenants only (no sandbox/demo kitchens). */
export function isConsumerListedTenant(data: Record<string, unknown>): boolean {
  if (!isActiveTenantStatus(data)) return false;
  const status = typeof data.status === 'string' ? data.status.toLowerCase() : '';
  if (status === 'suspended' || status === 'rejected') return false;
  if (data.sandboxMode === true) return false;
  return data.storeStatus === 'published';
}
