/**
 * Menu certification ports (M7 PR-13).
 */

import type { SdkAsyncResult } from '../../core/result';
import type { MenuCertificationEvidenceBundle } from '../../../domain/menu/certification/MenuCertificationEvidence';
import type {
  MenuCertificationDecisionPackage,
  MenuCertificationStatus,
  MenuSwitchReadinessAssessment,
} from '../../../domain/menu/certification/MenuCertificationStatus';

export interface MenuCertificationRecord {
  readonly certificationId: string;
  readonly status: MenuCertificationStatus;
  readonly decisionPackage: MenuCertificationDecisionPackage;
  readonly evidence: MenuCertificationEvidenceBundle;
  readonly storedAt: string;
}

export interface MenuCertificationRepositoryPort {
  save(record: MenuCertificationRecord): SdkAsyncResult<void>;
  getLatest(): SdkAsyncResult<MenuCertificationRecord | null>;
  getById(certificationId: string): SdkAsyncResult<MenuCertificationRecord | null>;
}

export interface MenuCertificationEvidencePort {
  collectEvidence(): SdkAsyncResult<MenuCertificationEvidenceBundle>;
}

export interface MenuCertificationReportPort {
  generateReport(
    certificationId: string,
    evidence: MenuCertificationEvidenceBundle
  ): SdkAsyncResult<MenuCertificationDecisionPackage>;
  getAssessment(
    evidence: MenuCertificationEvidenceBundle
  ): SdkAsyncResult<MenuSwitchReadinessAssessment>;
}
