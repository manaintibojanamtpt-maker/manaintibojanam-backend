/** Menu certification status types (M7 PR-13). Pure domain — no SDK imports. */

export type MenuCertificationStatus = 'READY' | 'CONDITIONAL' | 'NOT_READY';

export type MenuCertificationGoNoGo = 'GO' | 'CONDITIONAL_GO' | 'NO_GO';

export interface MenuSwitchReadinessAssessment {
  readonly status: MenuCertificationStatus;
  readonly goNoGo: MenuCertificationGoNoGo;
  readonly recommendation: string;
  readonly blockers: readonly string[];
  readonly assessedAt: string;
}

export interface MenuCertificationDecisionPackage {
  readonly certificationId: string;
  readonly status: MenuCertificationStatus;
  readonly goNoGo: MenuCertificationGoNoGo;
  readonly recommendation: string;
  readonly blockers: readonly string[];
  readonly warnings: readonly string[];
  readonly legacyAuthoritative: true;
  readonly productionActivationProhibited: true;
  readonly generatedAt: string;
}
