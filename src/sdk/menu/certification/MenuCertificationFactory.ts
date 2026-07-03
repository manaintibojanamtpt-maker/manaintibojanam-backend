/**
 * Menu certification factory (M7 PR-13).
 */

import type { MenuCertificationEvidenceBundle } from '../../../domain/menu/certification/MenuCertificationEvidence';
import type { MenuCertificationThresholds } from '../../../domain/menu/certification/MenuCertificationThresholds';
import type { MenuCertificationFeatureFlagReader } from './menuCertificationFeatureFlags';
import type { MenuCertificationTelemetryHook } from './MenuCertificationTelemetry';
import {
  createMenuCertificationEvidenceCollector,
  createHealthyMenuCertificationEvidence,
  type MenuCertificationEvidenceCollector,
} from './MenuCertificationEvidence';
import {
  createMenuCertificationReportGenerator,
  type MenuCertificationReportGenerator,
} from './MenuCertificationReport';
import {
  createInMemoryMenuCertificationRepository,
  type InMemoryMenuCertificationRepository,
} from './InMemoryMenuCertificationRepository';
import {
  createMenuCertificationEvaluator,
  type MenuCertificationEvaluator,
} from './MenuCertificationEvaluator';
import {
  createMenuProjectionCertification,
  type MenuProjectionCertification,
} from './MenuProjectionCertification';

export interface MenuCertificationInfrastructure {
  readonly evidence: MenuCertificationEvidenceCollector;
  readonly report: MenuCertificationReportGenerator;
  readonly repository: InMemoryMenuCertificationRepository;
  readonly evaluator: MenuCertificationEvaluator;
  readonly certification: MenuProjectionCertification;
}

export interface CreateMenuCertificationInfrastructureOptions {
  readonly featureFlags?: MenuCertificationFeatureFlagReader;
  readonly thresholds?: MenuCertificationThresholds;
  readonly evidence?: MenuCertificationEvidenceBundle;
  readonly onTelemetry?: MenuCertificationTelemetryHook;
}

export function createMenuCertificationInfrastructure(
  options: CreateMenuCertificationInfrastructureOptions = {}
): MenuCertificationInfrastructure {
  const evidenceBundle = options.evidence ?? createHealthyMenuCertificationEvidence();
  const evidence = createMenuCertificationEvidenceCollector(evidenceBundle);
  const report = createMenuCertificationReportGenerator({
    featureFlags: options.featureFlags,
    thresholds: options.thresholds,
  });
  const repository = createInMemoryMenuCertificationRepository();
  const evaluator = createMenuCertificationEvaluator({
    evidence,
    report,
    repository,
    onTelemetry: options.onTelemetry,
  });
  const certification = createMenuProjectionCertification({
    evidence,
    report,
    repository,
    evaluator,
  });

  return { evidence, report, repository, evaluator, certification };
}

export {
  createMenuCertificationEvidenceCollector,
  createHealthyMenuCertificationEvidence,
  createMenuCertificationReportGenerator,
  createInMemoryMenuCertificationRepository,
  createMenuCertificationEvaluator,
  createMenuProjectionCertification,
};
