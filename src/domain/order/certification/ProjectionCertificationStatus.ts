/** Projection certification status types (M6 PR-13). Pure domain — no SDK imports. */

export type ProjectionCertificationStatus = 'READY' | 'CONDITIONAL' | 'NOT_READY';

export type ProjectionCertificationGoNoGo = 'GO' | 'CONDITIONAL_GO' | 'NO_GO';

export interface ProjectionSwitchReadinessAssessment {
  readonly status: ProjectionCertificationStatus;
  readonly goNoGo: ProjectionCertificationGoNoGo;
  readonly recommendation: string;
  readonly blockers: readonly string[];
  readonly assessedAt: string;
}

export interface ProjectionCertificationDecisionPackage {
  readonly certificationId: string;
  readonly status: ProjectionCertificationStatus;
  readonly goNoGo: ProjectionCertificationGoNoGo;
  readonly recommendation: string;
  readonly blockers: readonly string[];
  readonly warnings: readonly string[];
  readonly legacyAuthoritative: true;
  readonly productionActivationProhibited: true;
  readonly generatedAt: string;
}
