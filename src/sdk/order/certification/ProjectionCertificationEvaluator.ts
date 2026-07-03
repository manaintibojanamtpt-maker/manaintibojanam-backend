/**
 * Projection certification evaluator (M6 PR-13).
 */

import type {
  ProjectionCertificationEvidencePort,
  ProjectionCertificationRecord,
  ProjectionCertificationReportPort,
  ProjectionCertificationRepositoryPort,
} from './projectionCertificationPorts';
import type { ProjectionCertificationDecisionPackage } from '../../../domain/order/certification/ProjectionCertificationStatus';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type { ProjectionCertificationTelemetryHook } from './ProjectionCertificationTelemetry';
import { createProjectionCertificationTelemetryEmitter } from './ProjectionCertificationTelemetry';

export interface ProjectionCertificationEvaluatorOptions {
  readonly evidence: ProjectionCertificationEvidencePort;
  readonly report: ProjectionCertificationReportPort;
  readonly repository: ProjectionCertificationRepositoryPort;
  readonly onTelemetry?: ProjectionCertificationTelemetryHook;
}

export class ProjectionCertificationEvaluator {
  constructor(private readonly options: ProjectionCertificationEvaluatorOptions) {}

  async certify(certificationId: string): SdkAsyncResult<ProjectionCertificationDecisionPackage> {
    const telemetry = createProjectionCertificationTelemetryEmitter(
      this.options.onTelemetry,
      'certify'
    );
    telemetry.certificationStarted(certificationId);

    const evidenceResult = await this.options.evidence.collectEvidence();
    if (!evidenceResult.ok) {
      telemetry.certificationFailed(evidenceResult.error.message, certificationId);
      return evidenceResult;
    }

    const reportResult = await this.options.report.generateReport(
      certificationId,
      evidenceResult.value
    );
    if (!reportResult.ok) {
      telemetry.certificationFailed(reportResult.error.message, certificationId);
      return reportResult;
    }

    const decision = reportResult.value;
    const record: ProjectionCertificationRecord = {
      certificationId,
      status: decision.status,
      decisionPackage: decision,
      evidence: evidenceResult.value,
      storedAt: new Date().toISOString(),
    };

    const saveResult = await this.options.repository.save(record);
    if (!saveResult.ok) {
      telemetry.certificationFailed(saveResult.error.message, certificationId);
      return saveResult;
    }

    telemetry.certificationCompleted(certificationId, decision.status);
    if (decision.status === 'READY') {
      telemetry.certificationReady(certificationId);
    } else if (decision.status === 'NOT_READY') {
      telemetry.certificationNotReady(
        certificationId,
        decision.blockers[0] ?? 'Certification not ready'
      );
    }

    return sdkOk(decision);
  }

  async getLatestCertification(): SdkAsyncResult<ProjectionCertificationRecord | null> {
    return this.options.repository.getLatest();
  }
}

export function createProjectionCertificationEvaluator(
  options: ProjectionCertificationEvaluatorOptions
): ProjectionCertificationEvaluator {
  return new ProjectionCertificationEvaluator(options);
}
