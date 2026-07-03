/**
 * Pricing certification report generator (M8 PR-13).
 */

import type { PricingCertificationReportPort } from './pricingCertificationPorts';
import type { PricingCertificationEvidenceBundle } from '../../../domain/pricing/certification/PricingCertificationEvidence';
import type {
  PricingCertificationDecisionPackage,
  PricingSwitchReadinessAssessment,
} from '../../../domain/pricing/certification/PricingCertificationStatus';
import type { PricingCertificationThresholds } from '../../../domain/pricing/certification/PricingCertificationThresholds';
import { mergePricingCertificationThresholds } from '../../../domain/pricing/certification/PricingCertificationThresholds';
import {
  assessPricingSwitchReadiness,
  buildPricingCertificationDecisionPackage,
} from '../../../domain/pricing/certification/PricingProjectionReadinessRules';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type { PricingCertificationFeatureFlagReader } from './pricingCertificationFeatureFlags';
import { readPricingCertificationFlagDefault } from './pricingCertificationFeatureFlags';

export interface PricingCertificationReportOptions {
  readonly featureFlags?: PricingCertificationFeatureFlagReader;
  readonly thresholds?: PricingCertificationThresholds;
}

export class PricingCertificationReportGenerator implements PricingCertificationReportPort {
  private readonly thresholds: PricingCertificationThresholds;

  constructor(private readonly options: PricingCertificationReportOptions = {}) {
    this.thresholds = mergePricingCertificationThresholds(options.thresholds);
  }

  private isEnabled(): boolean {
    const readFlag = this.options.featureFlags ?? readPricingCertificationFlagDefault;
    return readFlag('FF_PRICING_PROJECTION_CERTIFICATION_ENABLED');
  }

  getAssessment(
    evidence: PricingCertificationEvidenceBundle
  ): SdkAsyncResult<PricingSwitchReadinessAssessment> {
    const assessedAt = new Date().toISOString();
    const assessment = assessPricingSwitchReadiness(
      {
        certificationFlagEnabled: this.isEnabled(),
        evidence,
        thresholds: this.thresholds,
      },
      assessedAt
    );
    return Promise.resolve(sdkOk(assessment));
  }

  generateReport(
    certificationId: string,
    evidence: PricingCertificationEvidenceBundle
  ): SdkAsyncResult<PricingCertificationDecisionPackage> {
    const generatedAt = new Date().toISOString();
    const decisionPackage = buildPricingCertificationDecisionPackage(
      certificationId,
      {
        certificationFlagEnabled: this.isEnabled(),
        evidence,
        thresholds: this.thresholds,
      },
      generatedAt
    );
    return Promise.resolve(sdkOk(decisionPackage));
  }
}

export function createPricingCertificationReportGenerator(
  options: PricingCertificationReportOptions = {}
): PricingCertificationReportGenerator {
  return new PricingCertificationReportGenerator(options);
}
