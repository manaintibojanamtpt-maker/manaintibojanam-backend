/**
 * Pricing projection switch certification orchestrator (M8 PR-13).
 *
 * Certification only — does NOT switch PricingSDK, adapter, or rollout routing.
 */

import type {
  PricingCertificationEvidencePort,
  PricingCertificationRecord,
  PricingCertificationRepositoryPort,
  PricingCertificationReportPort,
} from './pricingCertificationPorts';
import type { PricingCertificationDecisionPackage } from '../../../domain/pricing/certification/PricingCertificationStatus';
import type { SdkAsyncResult } from '../../core/result';
import {
  PricingCertificationEvaluator,
  createPricingCertificationEvaluator,
} from './PricingCertificationEvaluator';

export interface PricingProjectionCertificationOptions {
  readonly evidence: PricingCertificationEvidencePort;
  readonly report: PricingCertificationReportPort;
  readonly repository: PricingCertificationRepositoryPort;
  readonly evaluator?: PricingCertificationEvaluator;
}

export class PricingProjectionCertification {
  private readonly evaluator: PricingCertificationEvaluator;

  constructor(private readonly options: PricingProjectionCertificationOptions) {
    this.evaluator =
      options.evaluator ??
      createPricingCertificationEvaluator({
        evidence: options.evidence,
        report: options.report,
        repository: options.repository,
      });
  }

  certify(certificationId: string): SdkAsyncResult<PricingCertificationDecisionPackage> {
    return this.evaluator.certify(certificationId);
  }

  getLatest(): SdkAsyncResult<PricingCertificationRecord | null> {
    return this.evaluator.getLatestCertification();
  }
}

export function createPricingProjectionCertification(
  options: PricingProjectionCertificationOptions
): PricingProjectionCertification {
  return new PricingProjectionCertification(options);
}
