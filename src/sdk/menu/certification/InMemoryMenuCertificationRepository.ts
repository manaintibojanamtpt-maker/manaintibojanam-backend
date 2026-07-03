/**
 * In-memory menu certification repository (M7 PR-13).
 */

import type {
  MenuCertificationRecord,
  MenuCertificationRepositoryPort,
} from './menuCertificationPorts';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';

export class InMemoryMenuCertificationRepository implements MenuCertificationRepositoryPort {
  private records: MenuCertificationRecord[] = [];

  save(record: MenuCertificationRecord): SdkAsyncResult<void> {
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

  getLatest(): SdkAsyncResult<MenuCertificationRecord | null> {
    const latest = this.records.length === 0 ? null : this.records[this.records.length - 1]!;
    return Promise.resolve(sdkOk(latest));
  }

  getById(certificationId: string): SdkAsyncResult<MenuCertificationRecord | null> {
    const record = this.records.find((item) => item.certificationId === certificationId) ?? null;
    return Promise.resolve(sdkOk(record));
  }
}

export function createInMemoryMenuCertificationRepository(): InMemoryMenuCertificationRepository {
  return new InMemoryMenuCertificationRepository();
}
