/** Founder kitchen — standalone tenant dashboard with full entitlements. */
export const FOUNDER_OWNER_EMAILS = [
  'manaintibojanamtpt@gmail.com',
  'bhojanos26@gmail.com',
] as const;

export const FOUNDER_TENANT_ID = 'mana-inti';

/** Tenant ids/slugs that receive full feature access (no plan gating). */
export const FOUNDER_TENANT_IDS = ['mana-inti', 'manaintibojanam'] as const;

/** Firestore role for founder — superadmin covers admin portal + platform APIs. */
export const FOUNDER_PLATFORM_ROLE = 'superadmin' as const;

export function isFounderOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return FOUNDER_OWNER_EMAILS.some((e) => e === normalized);
}

/** Founder has owner (mana-inti), admin, and superadmin access. */
export function hasFounderFullAccess(email?: string | null): boolean {
  return isFounderOwnerEmail(email);
}

export function isFounderTenant(tenantId?: string | null, tenantSlug?: string | null): boolean {
  const normalizedId = (tenantId || '').trim().toLowerCase();
  const normalizedSlug = (tenantSlug || '').trim().toLowerCase();
  return FOUNDER_TENANT_IDS.some(
    (founderId) => founderId === normalizedId || founderId === normalizedSlug,
  );
}

export function hasFounderTenantEntitlements(
  email?: string | null,
  tenantId?: string | null,
  tenantSlug?: string | null,
): boolean {
  return isFounderOwnerEmail(email) || isFounderTenant(tenantId, tenantSlug);
}
