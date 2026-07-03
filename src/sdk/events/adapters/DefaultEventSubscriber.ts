/**
 * EventSDK — default subscriber (M6 PR-2 infrastructure).
 * Subscription matching, replay dispatch, dead-letter delegation, retry metadata.
 */

import type { EventSubscriberPort, EventHandler } from '../contracts/ports';
import type { DeadLetterRepositoryPort } from '../contracts/infrastructurePorts';
import type { ReplayServicePort } from '../contracts/infrastructurePorts';
import type { Subscription } from '../dto/Subscription';
import type { SubscribeResult } from '../dto/SubscribeResult';
import type { EventEnvelope } from '../dto/EventEnvelope';
import type { SdkAsyncResult, SdkResult } from '../../core/result';
import { sdkFail, sdkOk } from '../../core/resultHelpers';
import { sdkError } from '../../core/resultHelpers';
import type { ClockPort, UuidPort } from '../contracts/ports';
import { asSubscriptionId } from '../types/branded';
import {
  readEventFlagDefault,
  type EventFeatureFlagReader,
} from '../core/featureFlags';
import { createStubEventSubscriber } from '../providers/StubEventSubscriber';
import { createDefaultClock } from '../providers/DefaultClock';
import { createDefaultUuid } from '../providers/DefaultUuid';
import type { EventInfrastructureTelemetryHook } from '../telemetry/EventInfrastructureTelemetry';
import { createEventInfrastructureTelemetryEmitter } from '../telemetry/EventInfrastructureTelemetry';
import {
  buildRetryAttempt,
  shouldDeadLetter,
  resolveNextRetryAt,
  DEFAULT_DEAD_LETTER_POLICY,
} from '../deadletter/DeadLetterPolicy';
import { resolveOutboxBackoffMs } from '../../../domain/events/outbox/OutboxPolicy';
import { validateSubscriptionFilter } from '../../../domain/events/subscriber/EventSubscriptionHandler';

export interface CreateDefaultEventSubscriberOptions {
  readonly featureFlags?: EventFeatureFlagReader;
  readonly uuid?: UuidPort;
  readonly clock?: ClockPort;
  readonly deadLetterRepository?: DeadLetterRepositoryPort;
  readonly replayService?: ReplayServicePort;
  readonly onTelemetry?: EventInfrastructureTelemetryHook;
}

interface RegisteredSubscription {
  readonly subscription: Subscription;
  readonly handler: EventHandler;
  attemptCount: number;
  readonly retryAttempts: import('../dto/RetryAttempt').RetryAttempt[];
}

export class DefaultEventSubscriber implements EventSubscriberPort {
  private readonly registry = new Map<string, RegisteredSubscription>();

  constructor(
    private readonly uuid: UuidPort,
    private readonly clock: ClockPort,
    private readonly deadLetterRepository?: DeadLetterRepositoryPort,
    private readonly replayService?: ReplayServicePort,
    private readonly onTelemetry?: EventInfrastructureTelemetryHook
  ) {}

  async subscribe<TPayload>(
    subscription: Omit<Subscription, 'subscriptionId' | 'createdAt'>,
    handler: EventHandler<TPayload>
  ): SdkAsyncResult<SubscribeResult> {
    const filterErrors = validateSubscriptionFilter({
      consumerGroup: subscription.consumerGroup,
      eventTypes: subscription.eventTypes,
      status: subscription.status,
    });
    if (filterErrors.length > 0) {
      return sdkFail(sdkError('VALIDATION', filterErrors.join('; ')));
    }

    const subscriptionId = asSubscriptionId(this.uuid.generate());
    const entry: RegisteredSubscription = {
      subscription: {
        ...subscription,
        subscriptionId,
        createdAt: this.clock.now(),
      },
      handler: handler as EventHandler,
      attemptCount: 0,
      retryAttempts: [],
    };
    this.registry.set(subscriptionId, entry);
    return sdkOk({ subscriptionId, registeredAt: entry.subscription.createdAt });
  }

  async unsubscribe(subscriptionId: string): SdkAsyncResult<void> {
    this.registry.delete(subscriptionId);
    return sdkOk(undefined);
  }

  /** Dispatch envelope to matching subscriptions. */
  async dispatch<TPayload>(envelope: EventEnvelope<TPayload>): Promise<number> {
    let count = 0;
    for (const entry of this.registry.values()) {
      const { subscription } = entry;
      if (subscription.status !== 'active') continue;
      if (!subscription.eventTypes.includes(envelope.header.type)) continue;

      const telemetry = createEventInfrastructureTelemetryEmitter(
        this.onTelemetry,
        'dispatch',
        envelope.metadata.correlationId
      );
      telemetry.subscriberMatched(subscription.consumerGroup, envelope.header.type);

      const result = await this.invokeHandler(entry, envelope);
      if (result.ok) {
        count += 1;
        entry.attemptCount = 0;
        entry.retryAttempts.length = 0;
      }
    }
    return count;
  }

  private async invokeHandler<TPayload>(
    entry: RegisteredSubscription,
    envelope: EventEnvelope<TPayload>
  ): Promise<SdkResult<void>> {
    const telemetry = createEventInfrastructureTelemetryEmitter(
      this.onTelemetry,
      'invokeHandler',
      envelope.metadata.correlationId
    );

    try {
      const result = await entry.handler(envelope);
      if (!result.ok) {
        return this.handleFailure(entry, envelope, result.error.message, 'HANDLER_ERROR', true);
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown handler error';
      telemetry.subscriberFailed('HANDLER_ERROR', entry.subscription.consumerGroup);
      return this.handleFailure(entry, envelope, message, 'HANDLER_ERROR', true);
    }
  }

  private async handleFailure<TPayload>(
    entry: RegisteredSubscription,
    envelope: EventEnvelope<TPayload>,
    message: string,
    code: import('../dto/FailureReason').FailureReasonCode,
    retryable: boolean
  ): Promise<SdkResult<void>> {
    entry.attemptCount += 1;
    const now = this.clock.now();
    const reason = { code, message, retryable };
    const backoff = resolveOutboxBackoffMs(entry.attemptCount - 1);
    const retryAttempt = buildRetryAttempt(
      entry.attemptCount,
      now,
      reason,
      resolveNextRetryAt(entry.attemptCount, now, backoff)
    );
    entry.retryAttempts.push(retryAttempt);

    if (
      shouldDeadLetter(entry.attemptCount, reason, DEFAULT_DEAD_LETTER_POLICY) &&
      entry.subscription.dlqEnabled &&
      this.deadLetterRepository
    ) {
      await this.deadLetterRepository.append({
        eventId: envelope.header.eventId,
        type: envelope.header.type,
        envelope,
        consumerGroup: entry.subscription.consumerGroup,
        reason: message,
        attemptCount: entry.attemptCount,
        metadata: {
          consumerGroup: entry.subscription.consumerGroup,
          subscriptionId: entry.subscription.subscriptionId,
          failure: reason,
          attempts: [...entry.retryAttempts],
          originalEventId: envelope.header.eventId,
          deadLetteredAt: now,
        },
      });
      return sdkFail(sdkError('INTERNAL', message));
    }

    return sdkFail(sdkError('INTERNAL', message));
  }

  /** Test helper — access replay service */
  getReplayService(): ReplayServicePort | undefined {
    return this.replayService;
  }
}

export function createDefaultEventSubscriber(
  options: CreateDefaultEventSubscriberOptions = {}
): EventSubscriberPort {
  const readFlag = options.featureFlags ?? readEventFlagDefault;

  if (!readFlag('FF_EVENT_PLATFORM_ENABLED')) {
    return createStubEventSubscriber();
  }

  const uuid = options.uuid ?? createDefaultUuid();
  const clock = options.clock ?? createDefaultClock();

  return new DefaultEventSubscriber(
    uuid,
    clock,
    options.deadLetterRepository,
    options.replayService,
    options.onTelemetry
  );
}

/** PR-1 factory alias */
export const createEventSubscriber = createDefaultEventSubscriber;
