/**
 * Menu certification report generator (M7 PR-13).
 */

import type { MenuCertificationReportPort } from './menuCertificationPorts';
import type { MenuCertificationEvidenceBundle } from '../../../domain/menu/certification/MenuCertificationEvidence';
import type {
  MenuCertificationDecisionPackage,
  MenuSwitchReadinessAssessment,
} from '../../../domain/menu/certification/MenuCertificationStatus';
import type { MenuCertificationThresholds } from '../../../domain/menu/certification/MenuCertificationThresholds';
import { mergeMenuCertificationThresholds } from '../../../domain/menu/certification/MenuCertificationThresholds';
import {
  assessMenuSwitchReadiness,
  buildMenuCertificationDecisionPackage,
} from '../../../domain/menu/certification/MenuProjectionReadinessRules';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type { MenuCertificationFeatureFlagReader } from './menuCertificationFeatureFlags';
import { readMenuCertificationFlagDefault } from './menuCertificationFeatureFlags';

export interface MenuCertificationReportOptions {
  readonly featureFlags?: MenuCertificationFeatureFlagReader;
  readonly thresholds?: MenuCertificationThresholds;
}

export class MenuCertificationReportGenerator implements MenuCertificationReportPort {
  private readonly thresholds: MenuCertificationThresholds;

  constructor(private readonly options: MenuCertificationReportOptions = {}) {
    this.thresholds = mergeMenuCertificationThresholds(options.thresholds);
  }

  private isEnabled(): boolean {
    const readFlag = this.options.featureFlags ?? readMenuCertificationFlagDefault;
    return readFlag('FF_MENU_PROJECTION_CERTIFICATION_ENABLED');
  }

  getAssessment(
    evidence: MenuCertificationEvidenceBundle
  ): SdkAsyncResult<MenuSwitchReadinessAssessment> {
    const assessedAt = new Date().toISOString();
    const assessment = assessMenuSwitchReadiness(
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
    evidence: MenuCertificationEvidenceBundle
  ): SdkAsyncResult<MenuCertificationDecisionPackage> {
    const generatedAt = new Date().toISOString();
    const decisionPackage = buildMenuCertificationDecisionPackage(
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

export function createMenuCertificationReportGenerator(
  options: MenuCertificationReportOptions = {}
): MenuCertificationReportGenerator {
  return new MenuCertificationReportGenerator(options);
}
