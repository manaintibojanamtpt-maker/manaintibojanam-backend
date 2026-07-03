/**
 * EventSDK — in-memory lease manager (M6 PR-4 test only).
 * No distributed implementation.
 */

import type { LeaseRepositoryPort, ProjectionLeaseRecord } from '../contracts/projectionPorts';
import type { ClockPort } from '../contracts/ports';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type { ProjectionTelemetryHook } from './ProjectionTelemetry';
import { createProjectionTelemetryEmitter } from './ProjectionTelemetry';

export class ProjectionLeaseManager implements LeaseRepositoryPort {
  private readonly leases = new Map<string, ProjectionLeaseRecord>();

  constructor(
    private readonly clock: ClockPort,
    private readonly onTelemetry?: ProjectionTelemetryHook
  ) {}

  private isExpired(record: ProjectionLeaseRecord): boolean {
    return record.expiresAt < this.clock.now();
  }

  async acquire(
    projectionName: string,
    holderId: string,
    ttlMs: number
  ): SdkAsyncResult<boolean> {
    const telemetry = createProjectionTelemetryEmitter(
      this.onTelemetry,
      'acquire',
      projectionName
    );
    const existing = this.leases.get(projectionName);
    if (existing && !this.isExpired(existing) && existing.holderId !== holderId) {
      return sdkOk(false);
    }

    const now = this.clock.now();
    const expiresAt = new Date(new Date(now).getTime() + ttlMs).toISOString();
    this.leases.set(projectionName, {
      projectionName,
      holderId,
      acquiredAt: now,
      expiresAt,
    });
    telemetry.leaseAcquired();
    return sdkOk(true);
  }

  async renew(
    projectionName: string,
    holderId: string,
    ttlMs: number
  ): SdkAsyncResult<boolean> {
    const telemetry = createProjectionTelemetryEmitter(
      this.onTelemetry,
      'renew',
      projectionName
    );
    const existing = this.leases.get(projectionName);
    if (!existing || existing.holderId !== holderId) {
      return sdkOk(false);
    }
    const now = this.clock.now();
    const expiresAt = new Date(new Date(now).getTime() + ttlMs).toISOString();
    this.leases.set(projectionName, { ...existing, expiresAt });
    telemetry.leaseRenewed();
    return sdkOk(true);
  }

  async release(projectionName: string, holderId: string): SdkAsyncResult<void> {
    const telemetry = createProjectionTelemetryEmitter(
      this.onTelemetry,
      'release',
      projectionName
    );
    const existing = this.leases.get(projectionName);
    if (existing?.holderId === holderId) {
      this.leases.delete(projectionName);
      telemetry.leaseReleased();
    }
    return sdkOk(undefined);
  }
}

export function createProjectionLeaseManager(
  clock: ClockPort,
  onTelemetry?: ProjectionTelemetryHook
): LeaseRepositoryPort {
  return new ProjectionLeaseManager(clock, onTelemetry);
}
