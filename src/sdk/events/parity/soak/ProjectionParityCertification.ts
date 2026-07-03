/**
 * Projection parity certification repository (M6 PR-9).
 * In-memory store — no Firestore.
 */

import type { ParityCertificationRepositoryPort } from '../../contracts/paritySoakPorts';
import type { ParityCertificationReport } from '../../../../domain/events/parity/soak/ParityCertificationRules';
import type { SdkAsyncResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';

export class ProjectionParityCertificationRepository implements ParityCertificationRepositoryPort {
  private readonly reports: ParityCertificationReport[] = [];

  save(report: ParityCertificationReport): SdkAsyncResult<void> {
    this.reports.push(report);
    return Promise.resolve(sdkOk(undefined));
  }

  getLatest(): SdkAsyncResult<ParityCertificationReport | null> {
    const latest = this.reports[this.reports.length - 1] ?? null;
    return Promise.resolve(sdkOk(latest));
  }

  list(limit: number): SdkAsyncResult<ParityCertificationReport[]> {
    return Promise.resolve(sdkOk(this.reports.slice(-limit)));
  }

  count(): SdkAsyncResult<number> {
    return Promise.resolve(sdkOk(this.reports.length));
  }
}

export function createProjectionParityCertificationRepository(): ProjectionParityCertificationRepository {
  return new ProjectionParityCertificationRepository();
}
