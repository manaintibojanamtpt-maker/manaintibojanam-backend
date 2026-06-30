/** Firestore menu items may use tenant doc id or slug — query both. */
export function getMenuTenantQueryKeys(
  tenant: { id?: string | null; slug?: string | null } | null | undefined,
  fallbackId?: string | null,
): string[] {
  const keys = new Set<string>();
  if (tenant?.id) keys.add(tenant.id);
  if (tenant?.slug) keys.add(tenant.slug);
  if (fallbackId) keys.add(fallbackId);
  return [...keys].filter(Boolean);
}
