/**
 * In-memory pricing certification repository (M8 PR-13).
 */

import type {
  PricingCertificationRecord,
  PricingCertificationRepositoryPort,
} from './pricingCertificationPorts';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';

export class InMemoryPricingCertificationRepository implements PricingCertificationRepositoryPort {
  private records: PricingCertificationRecord[] = [];

  save(record: PricingCertificationRecord): SdkAsyncResult<void> {
    const existingIndex = this.records.findIndex(
      (item) => item.certificationId === record.certificationId
    );
    if (existingIndex >= 0) {
      this.records[existingIndex] = record;
    } else {
      this.records.push(record);
    }
    return Promise.resolve(sdkOk(undefined));
  }

  getLatest(): SdkAsyncResult<PricingCertificationRecord | null> {
    const latest = this.records.length === 0 ? null : this.records[this.records.length - 1]!;
    return Promise.resolve(sdkOk(latest));
  }

  getById(certificationId: string): SdkAsyncResult<PricingCertificationRecord | null> {
    const record = this.records.find((item) => item.certificationId === certificationId) ?? null;
    return Promise.resolve(sdkOk(record));
  }
}

export function createInMemoryPricingCertificationRepository(): InMemoryPricingCertificationRepository {
  return new InMemoryPricingCertificationRepository();
}
