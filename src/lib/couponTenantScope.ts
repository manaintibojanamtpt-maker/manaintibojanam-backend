/** Coupon tenantId must match the checkout tenant document id or slug (same kitchen only). */
export function couponBelongsToTenant(
  coupon: { readonly tenantId?: unknown },
  tenantId: string,
  tenantSlug?: string,
): boolean {
  const couponTenant = typeof coupon.tenantId === 'string' ? coupon.tenantId.trim() : '';
  if (!couponTenant) return false;
  const candidates = new Set<string>([tenantId.trim()]);
  const slug = tenantSlug?.trim();
  if (slug) candidates.add(slug);
  return candidates.has(couponTenant);
}
