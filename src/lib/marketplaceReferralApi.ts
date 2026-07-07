import { EnvironmentConfig } from '../config/environment';

export interface ApplyReferralResult {
  applied: boolean;
  alreadyUsed?: boolean;
  referralCode?: string;
  discountAmount?: number;
}

export async function applyMarketplaceReferralCode(
  referralCode: string,
  idToken: string,
): Promise<{ ok: true; value: ApplyReferralResult } | { ok: false; message: string }> {
  const response = await fetch(`${EnvironmentConfig.getApiUrl()}/api/marketplace/referrals/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ referralCode: referralCode.trim().toUpperCase() }),
  });

  const payload = (await response.json()) as {
    ok?: boolean;
    value?: ApplyReferralResult;
    error?: { message?: string };
  };

  if (!response.ok || payload.ok === false) {
    return { ok: false, message: payload.error?.message ?? 'Failed to apply referral code' };
  }

  return { ok: true, value: payload.value ?? { applied: false } };
}
