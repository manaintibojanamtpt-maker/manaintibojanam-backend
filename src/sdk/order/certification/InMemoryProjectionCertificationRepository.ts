/**
 * In-memory projection certification repository (M6 PR-13).
 */

import type {
  ProjectionCertificationRecord,
  ProjectionCertificationRepositoryPort,
} from './projectionCertificationPorts';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';

export class InMemoryProjectionCertificationRepository implements ProjectionCertificationRepositoryPort {
  private records: ProjectionCertificationRecord[] = [];

  save(record: ProjectionCertificationRecord): SdkAsyncResult<void> {
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

  getLatest(): SdkAsyncResult<ProjectionCertificationRecord | null> {
    const latest = this.records.length === 0 ? null : this.records[this.records.length - 1]!;
    return Promise.resolve(sdkOk(latest));
  }

  getById(certificationId: string): SdkAsyncResult<ProjectionCertificationRecord | null> {
    const record = this.records.find((item) => item.certificationId === certificationId) ?? null;
    return Promise.resolve(sdkOk(record));
  }
}

export function createInMemoryProjectionCertificationRepository(): InMemoryProjectionCertificationRepository {
  return new InMemoryProjectionCertificationRepository();
}
