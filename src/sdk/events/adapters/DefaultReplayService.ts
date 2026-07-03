/**
 * EventSDK — default replay service (M6 PR-2 infrastructure).
 */

import type { ReplayServicePort } from '../contracts/infrastructurePorts';
import type { ReplayPort } from '../contracts/ports';
import type { ExtendedEventStorePort } from '../contracts/infrastructurePorts';
import type { ReplayRequest } from '../dto/ReplayRequest';
import type { ReplayResult } from '../dto/ReplayResult';
import type {
  ReplayRangeRequest,
  ReplayByAggregateRequest,
  ReplayByTypeRequest,
} from '../dto/ReplayRangeRequest';
import type { ClockPort } from '../contracts/ports';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import {
  readEventFlagDefault,
  type EventFeatureFlagReader,
} from '../core/featureFlags';
import { eventReplayDisabledAsync } from './notConfigured';
import type { EventInfrastructureTelemetryHook } from '../telemetry/EventInfrastructureTelemetry';
import { createEventInfrastructureTelemetryEmitter } from '../telemetry/EventInfrastructureTelemetry';

export interface CreateDefaultReplayServiceOptions {
  readonly featureFlags?: EventFeatureFlagReader;
  readonly eventStore: ExtendedEventStorePort;
  readonly clock: ClockPort;
  readonly onTelemetry?: EventInfrastructureTelemetryHook;
}

export class DefaultReplayService implements ReplayServicePort, ReplayPort {
  constructor(
    private readonly eventStore: ExtendedEventStorePort,
    private readonly clock: ClockPort,
    private readonly featureFlags: EventFeatureFlagReader,
    private readonly onTelemetry?: EventInfrastructureTelemetryHook
  ) {}

  private guardReplay(): SdkAsyncResult<never> | null {
    if (!this.featureFlags('FF_EVENT_REPLAY_ENABLED')) {
      return eventReplayDisabledAsync('replay');
    }
    return null;
  }

  private buildResult(
    consumerGroup: string,
    events: readonly { header: { eventId: import('../types/branded').EventId } }[],
    startedAt: string,
    dryRun: boolean,
    fromEventId?: import('../types/branded').EventId
  ): ReplayResult {
    return {
      consumerGroup,
      eventsReplayed: dryRun ? 0 : events.length,
      fromEventId,
      toEventId: events.at(-1)?.header.eventId,
      startedAt,
      completedAt: this.clock.now(),
      dryRun,
    };
  }

  async replay(request: ReplayRequest): SdkAsyncResult<ReplayResult> {
    const blocked = this.guardReplay();
    if (blocked) return blocked;

    const telemetry = createEventInfrastructureTelemetryEmitter(
      this.onTelemetry,
      'replay',
      undefined
    );
    telemetry.replayStarted(request.consumerGroup);

    const startedAt = this.clock.now();
    const readResult = await this.eventStore.read(
      { consumerGroup: request.consumerGroup, lastEventId: request.fromEventId },
      1000
    );
    if (!readResult.ok) return readResult;

    let events = readResult.value;
    if (request.eventTypes?.length) {
      const types = new Set(request.eventTypes);
      events = events.filter((e) => types.has(e.header.type));
    }

    const result = this.buildResult(
      request.consumerGroup,
      events,
      startedAt,
      request.dryRun ?? false,
      request.fromEventId
    );
    telemetry.replayCompleted(request.consumerGroup, result.eventsReplayed);
    return sdkOk(result);
  }

  async replayRange(request: ReplayRangeRequest): SdkAsyncResult<ReplayResult> {
    const blocked = this.guardReplay();
    if (blocked) return blocked;

    const telemetry = createEventInfrastructureTelemetryEmitter(this.onTelemetry, 'replayRange');
    telemetry.replayStarted(request.consumerGroup);

    const startedAt = this.clock.now();
    const readResult = await this.eventStore.read(
      { consumerGroup: request.consumerGroup, lastEventId: request.fromEventId },
      1000
    );
    if (!readResult.ok) return readResult;

    let events = readResult.value;
    if (request.toEventId) {
      const toIdx = events.findIndex((e) => e.header.eventId === request.toEventId);
      if (toIdx >= 0) events = events.slice(0, toIdx + 1);
    }
    if (request.fromTimestamp) {
      events = events.filter((e) => e.header.occurredAt >= request.fromTimestamp!);
    }
    if (request.toTimestamp) {
      events = events.filter((e) => e.header.occurredAt <= request.toTimestamp!);
    }

    const result = this.buildResult(
      request.consumerGroup,
      events,
      startedAt,
      request.dryRun ?? false,
      request.fromEventId
    );
    telemetry.replayCompleted(request.consumerGroup, result.eventsReplayed);
    return sdkOk(result);
  }

  async replayByAggregate(request: ReplayByAggregateRequest): SdkAsyncResult<ReplayResult> {
    const blocked = this.guardReplay();
    if (blocked) return blocked;

    const telemetry = createEventInfrastructureTelemetryEmitter(
      this.onTelemetry,
      'replayByAggregate'
    );
    telemetry.replayStarted(request.consumerGroup);

    const startedAt = this.clock.now();
    const readResult = await this.eventStore.readByAggregate(
      request.aggregateType,
      request.aggregateId,
      1000
    );
    if (!readResult.ok) return readResult;

    const result = this.buildResult(
      request.consumerGroup,
      readResult.value,
      startedAt,
      request.dryRun ?? false
    );
    telemetry.replayCompleted(request.consumerGroup, result.eventsReplayed);
    return sdkOk(result);
  }

  async replayByType(request: ReplayByTypeRequest): SdkAsyncResult<ReplayResult> {
    const blocked = this.guardReplay();
    if (blocked) return blocked;

    const telemetry = createEventInfrastructureTelemetryEmitter(this.onTelemetry, 'replayByType');
    telemetry.replayStarted(request.consumerGroup);

    const startedAt = this.clock.now();
    const allEvents: import('../dto/EventEnvelope').EventEnvelope[] = [];
    for (const type of request.eventTypes) {
      const readResult = await this.eventStore.readByType(type, 1000);
      if (!readResult.ok) return readResult;
      allEvents.push(...readResult.value);
    }

    const result = this.buildResult(
      request.consumerGroup,
      allEvents,
      startedAt,
      request.dryRun ?? false
    );
    telemetry.replayCompleted(request.consumerGroup, result.eventsReplayed);
    return sdkOk(result);
  }
}

export function createDefaultReplayService(
  options: CreateDefaultReplayServiceOptions
): ReplayServicePort {
  const readFlag = options.featureFlags ?? readEventFlagDefault;

  if (!readFlag('FF_EVENT_PLATFORM_ENABLED')) {
    return {
      replay: () => eventReplayDisabledAsync('replay'),
      replayRange: () => eventReplayDisabledAsync('replayRange'),
      replayByAggregate: () => eventReplayDisabledAsync('replayByAggregate'),
      replayByType: () => eventReplayDisabledAsync('replayByType'),
    };
  }

  return new DefaultReplayService(
    options.eventStore,
    options.clock,
    readFlag,
    options.onTelemetry
  );
}

/** Alias for backward compatibility with PR-1 createReplayEngine */
export const createReplayService = createDefaultReplayService;
