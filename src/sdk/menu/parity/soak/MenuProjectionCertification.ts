/**
 * Menu projection certification repository (M7 PR-9).
 * In-memory store — no Firestore.
 */

import type { MenuProjectionCertificationRepositoryPort } from './menuProjectionSoakPorts';
import type { MenuProjectionCertificationReport } from '../../../../domain/menu/parity/soak/MenuProjectionCertificationRules';
import type { SdkAsyncResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';

export class MenuProjectionCertificationRepository implements MenuProjectionCertificationRepositoryPort {
  private readonly reports: MenuProjectionCertificationReport[] = [];

  save(report: MenuProjectionCertificationReport): SdkAsyncResult<void> {
    this.reports.push(report);
    return Promise.resolve(sdkOk(undefined));
  }

  getLatest(): SdkAsyncResult<MenuProjectionCertificationReport | null> {
    const latest = this.reports[this.reports.length - 1] ?? null;
    return Promise.resolve(sdkOk(latest));
  }

  list(limit: number): SdkAsyncResult<MenuProjectionCertificationReport[]> {
    return Promise.resolve(sdkOk(this.reports.slice(-limit)));
  }

  count(): SdkAsyncResult<number> {
    return Promise.resolve(sdkOk(this.reports.length));
  }
}

export function createMenuProjectionCertificationRepository(): MenuProjectionCertificationRepository {
  return new MenuProjectionCertificationRepository();
}
