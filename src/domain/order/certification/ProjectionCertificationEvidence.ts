/** Projection certification evidence types (M6 PR-13). Pure domain — no SDK imports. */

export type ProjectionOperationalHealthLevel = 'GREEN' | 'AMBER' | 'RED';

export interface ParityCertificationEvidence {
  readonly certified: boolean;
  readonly parityPercent: number;
  readonly certificationId?: string;
}

export interface OperationalValidationEvidence {
  readonly health: ProjectionOperationalHealthLevel;
  readonly reportId?: string;
}

export interface RolloutMetricsEvidence {
  readonly currentStage: number;
  readonly fallbackRatePercent: number;
  readonly totalRequests: number;
}

export interface RollbackStatisticsEvidence {
  readonly rollbackCount: number;
  readonly totalRequests: number;
  readonly rollbackRatePercent: number;
}

export interface ProjectionHealthEvidence {
  readonly repositoryHealthy: boolean;
  readonly healthScore: number;
}

export interface ProjectionLagEvidence {
  readonly maximumLagMs: number;
  readonly p95LagMs: number;
}

export interface ReplayValidationEvidence {
  readonly replayAttempts: number;
  readonly replaySuccesses: number;
  readonly replaySuccessPercent: number;
}

export interface StagingSoakEvidence {
  readonly soakComplete: boolean;
  readonly soakHours: number;
  readonly soakCertificationId?: string;
}

export interface DriftEvidence {
  readonly unresolvedCriticalCount: number;
  readonly totalDriftEvents: number;
}

export interface GovernanceEvidence {
  readonly arbApprovalRecorded: boolean;
  readonly arbApprovalId?: string;
  readonly manualProductionApprovalGranted: boolean;
}

export interface ProjectionCertificationEvidenceBundle {
  readonly parity: ParityCertificationEvidence;
  readonly operational: OperationalValidationEvidence;
  readonly rollout: RolloutMetricsEvidence;
  readonly rollback: RollbackStatisticsEvidence;
  readonly projectionHealth: ProjectionHealthEvidence;
  readonly lag: ProjectionLagEvidence;
  readonly replay: ReplayValidationEvidence;
  readonly soak: StagingSoakEvidence;
  readonly drift: DriftEvidence;
  readonly governance: GovernanceEvidence;
  readonly collectedAt: string;
}
