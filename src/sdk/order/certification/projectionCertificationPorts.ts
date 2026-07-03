/**
 * Projection certification ports (M6 PR-13).
 */

import type { SdkAsyncResult } from '../../core/result';
import type { ProjectionCertificationEvidenceBundle } from '../../../domain/order/certification/ProjectionCertificationEvidence';
import type {
  ProjectionCertificationDecisionPackage,
  ProjectionCertificationStatus,
  ProjectionSwitchReadinessAssessment,
} from '../../../domain/order/certification/ProjectionCertificationStatus';

export interface ProjectionCertificationRecord {
  readonly certificationId: string;
  readonly status: ProjectionCertificationStatus;
  readonly decisionPackage: ProjectionCertificationDecisionPackage;
  readonly evidence: ProjectionCertificationEvidenceBundle;
  readonly storedAt: string;
}

export interface ProjectionCertificationRepositoryPort {
  save(record: ProjectionCertificationRecord): SdkAsyncResult<void>;
  getLatest(): SdkAsyncResult<ProjectionCertificationRecord | null>;
  getById(certificationId: string): SdkAsyncResult<ProjectionCertificationRecord | null>;
}

export interface ProjectionCertificationEvidencePort {
  collectEvidence(): SdkAsyncResult<ProjectionCertificationEvidenceBundle>;
}

export interface ProjectionCertificationReportPort {
  generateReport(
    certificationId: string,
    evidence: ProjectionCertificationEvidenceBundle
  ): SdkAsyncResult<ProjectionCertificationDecisionPackage>;
  getAssessment(
    evidence: ProjectionCertificationEvidenceBundle
  ): SdkAsyncResult<ProjectionSwitchReadinessAssessment>;
}
