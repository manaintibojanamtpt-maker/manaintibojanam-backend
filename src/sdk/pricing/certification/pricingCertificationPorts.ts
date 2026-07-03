/**
 * Pricing certification ports (M8 PR-13).
 */

import type { SdkAsyncResult } from '../../core/result';
import type { PricingCertificationEvidenceBundle } from '../../../domain/pricing/certification/PricingCertificationEvidence';
import type {
  PricingCertificationDecisionPackage,
  PricingCertificationStatus,
  PricingSwitchReadinessAssessment,
} from '../../../domain/pricing/certification/PricingCertificationStatus';

export interface PricingCertificationRecord {
  readonly certificationId: string;
  readonly status: PricingCertificationStatus;
  readonly decisionPackage: PricingCertificationDecisionPackage;
  readonly evidence: PricingCertificationEvidenceBundle;
  readonly storedAt: string;
}

export interface PricingCertificationRepositoryPort {
  save(record: PricingCertificationRecord): SdkAsyncResult<void>;
  getLatest(): SdkAsyncResult<PricingCertificationRecord | null>;
  getById(certificationId: string): SdkAsyncResult<PricingCertificationRecord | null>;
}

export interface PricingCertificationEvidencePort {
  collectEvidence(): SdkAsyncResult<PricingCertificationEvidenceBundle>;
}

export interface PricingCertificationReportPort {
  generateReport(
    certificationId: string,
    evidence: PricingCertificationEvidenceBundle
  ): SdkAsyncResult<PricingCertificationDecisionPackage>;
  getAssessment(
    evidence: PricingCertificationEvidenceBundle
  ): SdkAsyncResult<PricingSwitchReadinessAssessment>;
}
