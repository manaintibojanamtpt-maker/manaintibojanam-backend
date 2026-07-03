/**
 * Pricing certification evaluator (M8 PR-13).
 */

import type {
  PricingCertificationEvidencePort,
  PricingCertificationRecord,
  PricingCertificationReportPort,
  PricingCertificationRepositoryPort,
} from './pricingCertificationPorts';
import type { PricingCertificationDecisionPackage } from '../../../domain/pricing/certification/PricingCertificationStatus';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type { PricingCertificationTelemetryHook } from './PricingCertificationTelemetry';
import { createPricingCertificationTelemetryEmitter } from './PricingCertificationTelemetry';

export interface PricingCertificationEvaluatorOptions {
  readonly evidence: PricingCertificationEvidencePort;
  readonly report: PricingCertificationReportPort;
  readonly repository: PricingCertificationRepositoryPort;
  readonly onTelemetry?: PricingCertificationTelemetryHook;
}

export class PricingCertificationEvaluator {
  constructor(private readonly options: PricingCertificationEvaluatorOptions) {}

  async certify(certificationId: string): SdkAsyncResult<PricingCertificationDecisionPackage> {
    const telemetry = createPricingCertificationTelemetryEmitter(
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
    const record: PricingCertificationRecord = {
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

  async getLatestCertification(): SdkAsyncResult<PricingCertificationRecord | null> {
    return this.options.repository.getLatest();
  }
}

export function createPricingCertificationEvaluator(
  options: PricingCertificationEvaluatorOptions
): PricingCertificationEvaluator {
  return new PricingCertificationEvaluator(options);
}
