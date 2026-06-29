/** Founder kitchen — standalone tenant dashboard with full entitlements. */
export const FOUNDER_OWNER_EMAILS = [
  'manaintibojanamtpt@gmail.com',
  'bhojanos26@gmail.com',
] as const;

export const FOUNDER_TENANT_ID = 'mana-inti';

export function isFounderOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return FOUNDER_OWNER_EMAILS.some((e) => e === normalized);
}
