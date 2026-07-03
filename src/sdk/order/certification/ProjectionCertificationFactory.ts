/**
 * Projection certification factory (M6 PR-13).
 */

import type { ProjectionCertificationEvidenceBundle } from '../../../domain/order/certification/ProjectionCertificationEvidence';
import type { ProjectionCertificationThresholds } from '../../../domain/order/certification/ProjectionCertificationThresholds';
import type { ProjectionCertificationFeatureFlagReader } from './certificationFeatureFlags';
import type { ProjectionCertificationTelemetryHook } from './ProjectionCertificationTelemetry';
import {
  createProjectionCertificationEvidenceCollector,
  createHealthyCertificationEvidence,
  type ProjectionCertificationEvidenceCollector,
} from './ProjectionCertificationEvidence';
import {
  createProjectionCertificationReportGenerator,
  type ProjectionCertificationReportGenerator,
} from './ProjectionCertificationReport';
import {
  createInMemoryProjectionCertificationRepository,
  type InMemoryProjectionCertificationRepository,
} from './InMemoryProjectionCertificationRepository';
import {
  createProjectionCertificationEvaluator,
  type ProjectionCertificationEvaluator,
} from './ProjectionCertificationEvaluator';
import {
  createProjectionSwitchCertification,
  type ProjectionSwitchCertification,
} from './ProjectionSwitchCertification';

export interface ProjectionCertificationInfrastructure {
  readonly evidence: ProjectionCertificationEvidenceCollector;
  readonly report: ProjectionCertificationReportGenerator;
  readonly repository: InMemoryProjectionCertificationRepository;
  readonly evaluator: ProjectionCertificationEvaluator;
  readonly certification: ProjectionSwitchCertification;
}

export interface CreateProjectionCertificationInfrastructureOptions {
  readonly featureFlags?: ProjectionCertificationFeatureFlagReader;
  readonly thresholds?: ProjectionCertificationThresholds;
  readonly evidence?: ProjectionCertificationEvidenceBundle;
  readonly onTelemetry?: ProjectionCertificationTelemetryHook;
}

export function createProjectionCertificationInfrastructure(
  options: CreateProjectionCertificationInfrastructureOptions = {}
): ProjectionCertificationInfrastructure {
  const evidenceBundle = options.evidence ?? createHealthyCertificationEvidence();
  const evidence = createProjectionCertificationEvidenceCollector(evidenceBundle);
  const report = createProjectionCertificationReportGenerator({
    featureFlags: options.featureFlags,
    thresholds: options.thresholds,
  });
  const repository = createInMemoryProjectionCertificationRepository();
  const evaluator = createProjectionCertificationEvaluator({
    evidence,
    report,
    repository,
    onTelemetry: options.onTelemetry,
  });
  const certification = createProjectionSwitchCertification({
    evidence,
    report,
    repository,
    evaluator,
  });

  return { evidence, report, repository, evaluator, certification };
}

export {
  createProjectionCertificationEvidenceCollector,
  createHealthyCertificationEvidence,
  createProjectionCertificationReportGenerator,
  createInMemoryProjectionCertificationRepository,
  createProjectionCertificationEvaluator,
  createProjectionSwitchCertification,
};
