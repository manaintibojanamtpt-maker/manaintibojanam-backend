/**
 * Pricing projection certification repository (M8 PR-9).
 * In-memory store — no Firestore.
 */

import type { PricingProjectionCertificationRepositoryPort } from './pricingProjectionSoakPorts';
import type { PricingProjectionCertificationReport } from '../../../../domain/pricing/parity/soak/PricingProjectionCertificationRules';
import type { SdkAsyncResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';

export class PricingProjectionCertificationRepository
  implements PricingProjectionCertificationRepositoryPort
{
  private readonly reports: PricingProjectionCertificationReport[] = [];

  save(report: PricingProjectionCertificationReport): SdkAsyncResult<void> {
    this.reports.push(report);
    return Promise.resolve(sdkOk(undefined));
  }

  getLatest(): SdkAsyncResult<PricingProjectionCertificationReport | null> {
    const latest = this.reports[this.reports.length - 1] ?? null;
    return Promise.resolve(sdkOk(latest));
  }

  list(limit: number): SdkAsyncResult<PricingProjectionCertificationReport[]> {
    return Promise.resolve(sdkOk(this.reports.slice(-limit)));
  }

  count(): SdkAsyncResult<number> {
    return Promise.resolve(sdkOk(this.reports.length));
  }
}

export function createPricingProjectionCertificationRepository(): PricingProjectionCertificationRepository {
  return new PricingProjectionCertificationRepository();
}
