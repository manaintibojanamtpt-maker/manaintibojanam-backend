/**
 * Projection switch certification orchestrator (M6 PR-13).
 *
 * Certification only — does NOT switch OrderSDK, adapter, or rollout routing.
 */

import type {
  ProjectionCertificationEvidencePort,
  ProjectionCertificationRecord,
  ProjectionCertificationRepositoryPort,
  ProjectionCertificationReportPort,
} from './projectionCertificationPorts';
import type { ProjectionCertificationDecisionPackage } from '../../../domain/order/certification/ProjectionCertificationStatus';
import type { SdkAsyncResult } from '../../core/result';
import {
  ProjectionCertificationEvaluator,
  createProjectionCertificationEvaluator,
} from './ProjectionCertificationEvaluator';

export interface ProjectionSwitchCertificationOptions {
  readonly evidence: ProjectionCertificationEvidencePort;
  readonly report: ProjectionCertificationReportPort;
  readonly repository: ProjectionCertificationRepositoryPort;
  readonly evaluator?: ProjectionCertificationEvaluator;
}

export class ProjectionSwitchCertification {
  private readonly evaluator: ProjectionCertificationEvaluator;

  constructor(private readonly options: ProjectionSwitchCertificationOptions) {
    this.evaluator =
      options.evaluator ??
      createProjectionCertificationEvaluator({
        evidence: options.evidence,
        report: options.report,
        repository: options.repository,
      });
  }

  certify(certificationId: string): SdkAsyncResult<ProjectionCertificationDecisionPackage> {
    return this.evaluator.certify(certificationId);
  }

  getLatest(): SdkAsyncResult<ProjectionCertificationRecord | null> {
    return this.evaluator.getLatestCertification();
  }
}

export function createProjectionSwitchCertification(
  options: ProjectionSwitchCertificationOptions
): ProjectionSwitchCertification {
  return new ProjectionSwitchCertification(options);
}
