/**
 * EventSDK — projection rebuild engine (M6 PR-4).
 * Infrastructure-only rebuild support — no runtime or business rebuilds.
 */

import type { ProjectionRebuildPort } from '../contracts/projectionPorts';
import type {
  ProjectionRebuildRequest,
  ProjectionRebuildResult,
  ProjectionRebuildStatus,
} from '../../../domain/events/projection/shared/ProjectionIdentityTypes';
import type { ClockPort } from '../contracts/ports';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import {
  readEventFlagDefault,
  type EventFeatureFlagReader,
} from '../core/featureFlags';
import { eventNotConfiguredAsync } from '../adapters/notConfigured';
import {
  prepareRebuildPlan,
  transitionRebuildStatus,
  buildRebuildResult,
} from '../../../domain/events/projection/ProjectionRebuildPolicy';
import type { ProjectionTelemetryHook } from './ProjectionTelemetry';
import { createProjectionTelemetryEmitter } from './ProjectionTelemetry';

interface RebuildState {
  request: ProjectionRebuildRequest;
  status: ProjectionRebuildStatus;
  eventsPlanned: number;
  eventsProcessed: number;
  startedAt: string;
  completedAt?: string;
}

export interface ProjectionRebuildEngineOptions {
  readonly featureFlags?: EventFeatureFlagReader;
  readonly clock: ClockPort;
  readonly onTelemetry?: ProjectionTelemetryHook;
}

export class ProjectionRebuildEngine implements ProjectionRebuildPort {
  private readonly rebuilds = new Map<string, RebuildState>();

  constructor(private readonly options: ProjectionRebuildEngineOptions) {}

  private isEnabled(): boolean {
    const readFlag = this.options.featureFlags ?? readEventFlagDefault;
    return readFlag('FF_EVENT_PLATFORM_ENABLED') && readFlag('FF_EVENT_PROJECTION_ENABLED');
  }

  private toResult(state: RebuildState): ProjectionRebuildResult {
    return buildRebuildResult(
      state.request.rebuildId,
      state.request.identity,
      state.status,
      state.eventsPlanned,
      state.eventsProcessed,
      state.startedAt,
      state.completedAt
    );
  }

  async prepareRebuild(request: ProjectionRebuildRequest): SdkAsyncResult<ProjectionRebuildResult> {
    if (!this.isEnabled()) {
      return eventNotConfiguredAsync('prepareRebuild', 'ProjectionRebuildEngine');
    }

    const plan = prepareRebuildPlan(request.identity, {
      fromEventId: request.fromEventId,
      dryRun: request.dryRun ?? true,
    });
    if (!plan) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid rebuild request or replay not supported',
        },
      };
    }

    const telemetry = createProjectionTelemetryEmitter(
      this.options.onTelemetry,
      'prepareRebuild',
      request.identity.projectionName,
      request.identity.consumerGroup
    );

    const startedAt = this.options.clock.now();
    const state: RebuildState = {
      request,
      status: transitionRebuildStatus('idle', 'prepare'),
      eventsPlanned: plan.batchSize,
      eventsProcessed: 0,
      startedAt,
    };
    this.rebuilds.set(request.rebuildId, state);
    telemetry.rebuildStarted(request.rebuildId);

    return sdkOk(this.toResult(state));
  }

  async executeRebuild(rebuildId: string): SdkAsyncResult<ProjectionRebuildResult> {
    if (!this.isEnabled()) {
      return eventNotConfiguredAsync('executeRebuild', 'ProjectionRebuildEngine');
    }

    const state = this.rebuilds.get(rebuildId);
    if (!state) {
      return {
        ok: false,
        error: { code: 'NOT_FOUND', message: `Rebuild ${rebuildId} not found` },
      };
    }

    state.status = transitionRebuildStatus(state.status, 'execute');
    if (state.request.dryRun) {
      state.eventsProcessed = 0;
    } else {
      state.eventsProcessed = state.eventsPlanned;
    }

    return sdkOk(this.toResult(state));
  }

  async resumeRebuild(rebuildId: string): SdkAsyncResult<ProjectionRebuildResult> {
    if (!this.isEnabled()) {
      return eventNotConfiguredAsync('resumeRebuild', 'ProjectionRebuildEngine');
    }

    const state = this.rebuilds.get(rebuildId);
    if (!state) {
      return {
        ok: false,
        error: { code: 'NOT_FOUND', message: `Rebuild ${rebuildId} not found` },
      };
    }

    state.status = transitionRebuildStatus(state.status, 'resume');
    return sdkOk(this.toResult(state));
  }

  async cancelRebuild(rebuildId: string): SdkAsyncResult<ProjectionRebuildResult> {
    if (!this.isEnabled()) {
      return eventNotConfiguredAsync('cancelRebuild', 'ProjectionRebuildEngine');
    }

    const state = this.rebuilds.get(rebuildId);
    if (!state) {
      return {
        ok: false,
        error: { code: 'NOT_FOUND', message: `Rebuild ${rebuildId} not found` },
      };
    }

    state.status = transitionRebuildStatus(state.status, 'cancel');
    state.completedAt = this.options.clock.now();

    const telemetry = createProjectionTelemetryEmitter(
      this.options.onTelemetry,
      'cancelRebuild',
      state.request.identity.projectionName,
      state.request.identity.consumerGroup
    );
    telemetry.rebuildCompleted(rebuildId, state.eventsProcessed);

    return sdkOk(this.toResult(state));
  }
}

export function createProjectionRebuildEngine(
  options: ProjectionRebuildEngineOptions
): ProjectionRebuildPort {
  return new ProjectionRebuildEngine(options);
}
