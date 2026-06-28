import type { ReleaseNote } from '../types';

/**
 * Single source of truth for the next platform release.
 * Update this file before deploy; Super Admin → Release Center will offer one-click publish.
 */
export const PENDING_PLATFORM_RELEASE: Omit<ReleaseNote, 'id' | 'publishedAt'> & {
  publishedAt?: never;
} = {
  version: '1.1.0',
  title: 'BhojanOS Platform Release — Marketing, Owner Portal & Security',
  summary:
    'Major platform update with enterprise marketing site, clearer onboarding and pricing, compliance improvements, AI notifications, payment hardening, and super-admin security fixes.',
  category: 'merchant_growth',
  highlights: [
    'Enterprise marketing site (About, Platform, Pricing, Security, Contact)',
    'Free storefront vs Growth trial clarity — 14-day trial starts at publish',
    'KYC / Compliance accordion with step-by-step completion flow',
    'AI Notification Center and dashboard priority-action fixes',
    'Super Admin security — platform admins cannot open owner dashboards',
    'Payment hardening (Razorpay + manual UPI flows)',
    'Owner store live/offline control and portal reliability improvements',
    'Performance, mobile UX, and storefront routing fixes',
  ],
  isPublished: false,
  publishedBy: 'BhojanOS Platform',
};

export function isReleaseNewer(candidate: string, baseline?: string | null): boolean {
  if (!baseline) return true;
  return candidate.localeCompare(baseline, undefined, { numeric: true, sensitivity: 'base' }) > 0;
}
