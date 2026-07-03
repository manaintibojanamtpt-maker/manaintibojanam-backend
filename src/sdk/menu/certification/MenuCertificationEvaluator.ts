/**
 * Menu certification evaluator (M7 PR-13).
 */

import type {
  MenuCertificationEvidencePort,
  MenuCertificationRecord,
  MenuCertificationReportPort,
  MenuCertificationRepositoryPort,
} from './menuCertificationPorts';
import type { MenuCertificationDecisionPackage } from '../../../domain/menu/certification/MenuCertificationStatus';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type { MenuCertificationTelemetryHook } from './MenuCertificationTelemetry';
import { createMenuCertificationTelemetryEmitter } from './MenuCertificationTelemetry';

export interface MenuCertificationEvaluatorOptions {
  readonly evidence: MenuCertificationEvidencePort;
  readonly report: MenuCertificationReportPort;
  readonly repository: MenuCertificationRepositoryPort;
  readonly onTelemetry?: MenuCertificationTelemetryHook;
}

export class MenuCertificationEvaluator {
  constructor(private readonly options: MenuCertificationEvaluatorOptions) {}

  async certify(certificationId: string): SdkAsyncResult<MenuCertificationDecisionPackage> {
    const telemetry = createMenuCertificationTelemetryEmitter(
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
    const record: MenuCertificationRecord = {
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

  async getLatestCertification(): SdkAsyncResult<MenuCertificationRecord | null> {
    return this.options.repository.getLatest();
  }
}

export function createMenuCertificationEvaluator(
  options: MenuCertificationEvaluatorOptions
): MenuCertificationEvaluator {
  return new MenuCertificationEvaluator(options);
}
