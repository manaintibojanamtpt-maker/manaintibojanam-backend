/** OrderBhojan consumer support — human escalation only (no in-chat mutations). */
export const OB_SUPPORT_EMAIL = 'support@orderbhojan.com';

export const OB_SUPPORT_MAILTO =
  `mailto:${OB_SUPPORT_EMAIL}?subject=${encodeURIComponent('OrderBhojan Support')}`;

/** Prefer this subject when escalating refund / cancel / payment issues. */
export function buildObSupportMailto(subject: string): string {
  const trimmed = subject.trim() || 'OrderBhojan Support';
  return `mailto:${OB_SUPPORT_EMAIL}?subject=${encodeURIComponent(trimmed)}`;
}
