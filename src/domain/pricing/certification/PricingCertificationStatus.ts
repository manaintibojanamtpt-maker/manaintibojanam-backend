/** Pricing certification status types (M8 PR-13). Pure domain — no SDK imports. */

export type PricingCertificationStatus = 'READY' | 'CONDITIONAL' | 'NOT_READY';

export type PricingCertificationGoNoGo = 'GO' | 'CONDITIONAL_GO' | 'NO_GO';

export interface PricingSwitchReadinessAssessment {
  readonly status: PricingCertificationStatus;
  readonly goNoGo: PricingCertificationGoNoGo;
  readonly recommendation: string;
  readonly blockers: readonly string[];
  readonly assessedAt: string;
}

export interface PricingCertificationDecisionPackage {
  readonly certificationId: string;
  readonly status: PricingCertificationStatus;
  readonly goNoGo: PricingCertificationGoNoGo;
  readonly recommendation: string;
  readonly blockers: readonly string[];
  readonly warnings: readonly string[];
  readonly legacyAuthoritative: true;
  readonly productionActivationProhibited: true;
  readonly generatedAt: string;
}
