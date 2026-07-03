/**
 * Pricing certification factory (M8 PR-13).
 */

import type { PricingCertificationEvidenceBundle } from '../../../domain/pricing/certification/PricingCertificationEvidence';
import type { PricingCertificationThresholds } from '../../../domain/pricing/certification/PricingCertificationThresholds';
import type { PricingCertificationFeatureFlagReader } from './pricingCertificationFeatureFlags';
import type { PricingCertificationTelemetryHook } from './PricingCertificationTelemetry';
import {
  createPricingCertificationEvidenceCollector,
  createHealthyPricingCertificationEvidence,
  type PricingCertificationEvidenceCollector,
} from './PricingCertificationEvidence';
import {
  createPricingCertificationReportGenerator,
  type PricingCertificationReportGenerator,
} from './PricingCertificationReport';
import {
  createInMemoryPricingCertificationRepository,
  type InMemoryPricingCertificationRepository,
} from './InMemoryPricingCertificationRepository';
import {
  createPricingCertificationEvaluator,
  type PricingCertificationEvaluator,
} from './PricingCertificationEvaluator';
import {
  createPricingProjectionCertification,
  type PricingProjectionCertification,
} from './PricingProjectionCertification';

export interface PricingCertificationInfrastructure {
  readonly evidence: PricingCertificationEvidenceCollector;
  readonly report: PricingCertificationReportGenerator;
  readonly repository: InMemoryPricingCertificationRepository;
  readonly evaluator: PricingCertificationEvaluator;
  readonly certification: PricingProjectionCertification;
}

export interface CreatePricingCertificationInfrastructureOptions {
  readonly featureFlags?: PricingCertificationFeatureFlagReader;
  readonly thresholds?: PricingCertificationThresholds;
  readonly evidence?: PricingCertificationEvidenceBundle;
  readonly onTelemetry?: PricingCertificationTelemetryHook;
}

export function createPricingCertificationInfrastructure(
  options: CreatePricingCertificationInfrastructureOptions = {}
): PricingCertificationInfrastructure {
  const evidenceBundle = options.evidence ?? createHealthyPricingCertificationEvidence();
  const evidence = createPricingCertificationEvidenceCollector(evidenceBundle);
  const report = createPricingCertificationReportGenerator({
    featureFlags: options.featureFlags,
    thresholds: options.thresholds,
  });
  const repository = createInMemoryPricingCertificationRepository();
  const evaluator = createPricingCertificationEvaluator({
    evidence,
    report,
    repository,
    onTelemetry: options.onTelemetry,
  });
  const certification = createPricingProjectionCertification({
    evidence,
    report,
    repository,
    evaluator,
  });

  return { evidence, report, repository, evaluator, certification };
}

export {
  createPricingCertificationEvidenceCollector,
  createHealthyPricingCertificationEvidence,
  createPricingCertificationReportGenerator,
  createInMemoryPricingCertificationRepository,
  createPricingCertificationEvaluator,
  createPricingProjectionCertification,
};
