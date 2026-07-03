/**
 * Menu projection switch certification orchestrator (M7 PR-13).
 *
 * Certification only — does NOT switch MenuSDK, adapter, or rollout routing.
 */

import type {
  MenuCertificationEvidencePort,
  MenuCertificationRecord,
  MenuCertificationRepositoryPort,
  MenuCertificationReportPort,
} from './menuCertificationPorts';
import type { MenuCertificationDecisionPackage } from '../../../domain/menu/certification/MenuCertificationStatus';
import type { SdkAsyncResult } from '../../core/result';
import {
  MenuCertificationEvaluator,
  createMenuCertificationEvaluator,
} from './MenuCertificationEvaluator';

export interface MenuProjectionCertificationOptions {
  readonly evidence: MenuCertificationEvidencePort;
  readonly report: MenuCertificationReportPort;
  readonly repository: MenuCertificationRepositoryPort;
  readonly evaluator?: MenuCertificationEvaluator;
}

export class MenuProjectionCertification {
  private readonly evaluator: MenuCertificationEvaluator;

  constructor(private readonly options: MenuProjectionCertificationOptions) {
    this.evaluator =
      options.evaluator ??
      createMenuCertificationEvaluator({
        evidence: options.evidence,
        report: options.report,
        repository: options.repository,
      });
  }

  certify(certificationId: string): SdkAsyncResult<MenuCertificationDecisionPackage> {
    return this.evaluator.certify(certificationId);
  }

  getLatest(): SdkAsyncResult<MenuCertificationRecord | null> {
    return this.evaluator.getLatestCertification();
  }
}

export function createMenuProjectionCertification(
  options: MenuProjectionCertificationOptions
): MenuProjectionCertification {
  return new MenuProjectionCertification(options);
}
