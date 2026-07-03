/**
 * Projection certification report generator (M6 PR-13).
 */

import type { ProjectionCertificationReportPort } from './projectionCertificationPorts';
import type { ProjectionCertificationEvidenceBundle } from '../../../domain/order/certification/ProjectionCertificationEvidence';
import type {
  ProjectionCertificationDecisionPackage,
  ProjectionSwitchReadinessAssessment,
} from '../../../domain/order/certification/ProjectionCertificationStatus';
import type { ProjectionCertificationThresholds } from '../../../domain/order/certification/ProjectionCertificationThresholds';
import { mergeProjectionCertificationThresholds } from '../../../domain/order/certification/ProjectionCertificationThresholds';
import {
  assessProjectionSwitchReadiness,
  buildProjectionCertificationDecisionPackage,
} from '../../../domain/order/certification/ProjectionReadinessRules';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type { ProjectionCertificationFeatureFlagReader } from './certificationFeatureFlags';
import { readProjectionCertificationFlagDefault } from './certificationFeatureFlags';

export interface ProjectionCertificationReportOptions {
  readonly featureFlags?: ProjectionCertificationFeatureFlagReader;
  readonly thresholds?: ProjectionCertificationThresholds;
}

export class ProjectionCertificationReportGenerator implements ProjectionCertificationReportPort {
  private readonly thresholds: ProjectionCertificationThresholds;

  constructor(private readonly options: ProjectionCertificationReportOptions = {}) {
    this.thresholds = mergeProjectionCertificationThresholds(options.thresholds);
  }

  private isEnabled(): boolean {
    const readFlag = this.options.featureFlags ?? readProjectionCertificationFlagDefault;
    return readFlag('FF_ORDER_PROJECTION_CERTIFICATION_ENABLED');
  }

  getAssessment(
    evidence: ProjectionCertificationEvidenceBundle
  ): SdkAsyncResult<ProjectionSwitchReadinessAssessment> {
    const assessedAt = new Date().toISOString();
    const assessment = assessProjectionSwitchReadiness(
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
    evidence: ProjectionCertificationEvidenceBundle
  ): SdkAsyncResult<ProjectionCertificationDecisionPackage> {
    const generatedAt = new Date().toISOString();
    const decisionPackage = buildProjectionCertificationDecisionPackage(
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

export function createProjectionCertificationReportGenerator(
  options: ProjectionCertificationReportOptions = {}
): ProjectionCertificationReportGenerator {
  return new ProjectionCertificationReportGenerator(options);
}
