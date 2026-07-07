import { ownerApiRequest } from './ownerProvisioning';

export interface OwnerReferralSummary {
  referralCode: string;
  successfulReferrals: number;
  referralCount: number;
}

export async function fetchOwnerReferrals(tenantId: string) {
  return ownerApiRequest<{
    success: boolean;
    tenantId: string;
    referral: OwnerReferralSummary;
  }>('GET', `/api/owner/referrals?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function launchOwnerCampaign(input: {
  tenantId: string;
  audience: string;
  couponCode: string;
  expectedReach: number;
  expectedOrders: number;
  expectedRevenueLift: number;
  confidenceScore: number;
}) {
  return ownerApiRequest<{ success: boolean; id: string }>('POST', '/api/owner/campaigns', input);
}

export async function saveOwnerKycProfile(tenantId: string, kyc: Record<string, unknown>) {
  return ownerApiRequest<{ success: boolean }>('PUT', '/api/owner/kyc/profile', { tenantId, kyc });
}

export async function acceptOwnerKycDeclaration(tenantId: string) {
  return ownerApiRequest<{ success: boolean }>('PUT', '/api/owner/kyc/declaration', { tenantId });
}

export async function submitOwnerFeedback(input: Record<string, unknown>) {
  return ownerApiRequest<{ success: boolean; emailSent?: boolean }>('POST', '/api/owner/feedback', input);
}

export async function fetchLatestReleaseNote() {
  return ownerApiRequest<{ success: boolean; release: Record<string, unknown> | null }>(
    'GET',
    '/api/owner/release-notes/latest',
  );
}

export async function updateOwnerTenantPreferences(
  tenantId: string,
  preferences: { lastViewedReleaseVersion?: string },
) {
  return ownerApiRequest<{ success: boolean }>('PATCH', '/api/owner/tenant/preferences', {
    tenantId,
    ...preferences,
  });
}
