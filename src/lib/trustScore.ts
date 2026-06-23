import { Tenant } from '../types';

export const calculateTrustScore = (tenant: Tenant): number => {
  let score = 0;

  // 1. Email Verified (+20)
  if (tenant.kyc?.emailVerificationStatus === 'verified') score += 20;

  // 2. KYC Completed (Verification Level > 0) (+20)
  if (tenant.kyc?.verificationLevel && tenant.kyc.verificationLevel > 0) score += 20;

  // 3. Agreement Accepted (+15)
  if (tenant.legal?.merchantDeclarationAcceptedAt) score += 15;

  // 4. FSSAI Submitted or Verified (+20)
  if (tenant.fssai?.verificationStatus === 'verified') {
    score += 20;
  } else if (tenant.fssai?.verificationStatus === 'pending_submission' && tenant.fssai.registrationNumber) {
    score += 10;
  }

  // 5. Store Completeness (+15)
  let completeness = 0;
  if (tenant.name) completeness += 5;
  if (tenant.location?.lat) completeness += 5;
  if (tenant.deliveryConfig?.freeRadius) completeness += 5;
  score += completeness;

  // 6. Documents Uploaded (+10)
  if (tenant.kyc?.documents?.addressProof) score += 5;
  if (tenant.kyc?.documents?.idProof) score += 5;

  return Math.min(100, Math.max(0, score));
};
