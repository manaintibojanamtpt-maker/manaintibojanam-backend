/**
 * EventSDK — in-memory projection registry (M6 PR-4 test only).
 * Duplicate ProjectionIdentity MUST fail registration.
 */

import type {
  ProjectionRegistryPort,
  ProjectionHandlerRegistration,
} from '../contracts/projectionPorts';
import type { EventTypeName } from '../types/branded';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import {
  assertUniqueProjectionIdentity,
  validateProjectionIdentity,
} from '../../../domain/events/projection/ProjectionIdentity';

export class ProjectionRegistry implements ProjectionRegistryPort {
  private readonly handlers: ProjectionHandlerRegistration[] = [];

  validate(registration: ProjectionHandlerRegistration): SdkAsyncResult<readonly string[]> {
    const errors = [
      ...validateProjectionIdentity(registration.identity),
      ...assertUniqueProjectionIdentity(
        this.handlers.map((h) => h.identity),
        registration.identity
      ),
    ];
    if (!registration.eventTypes.length) errors.push('eventTypes must not be empty');
    if (!registration.handlerVersion) errors.push('handlerVersion is required');
    if (!registration.handler) errors.push('handler is required');
    return Promise.resolve(sdkOk(errors));
  }

  async register(registration: ProjectionHandlerRegistration): SdkAsyncResult<void> {
    const validation = await this.validate(registration);
    if (!validation.ok) return validation;
    if (validation.value.length > 0) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: validation.value.join('; '),
        },
      };
    }
    this.handlers.push(registration);
    return sdkOk(undefined);
  }

  unregister(
    projectionName: string,
    consumerGroup: string,
    projectionVersion?: string
  ): SdkAsyncResult<void> {
    const filtered = this.handlers.filter((h) => {
      const id = h.identity;
      if (id.projectionName !== projectionName || id.consumerGroup !== consumerGroup) {
        return true;
      }
      if (projectionVersion && id.projectionVersion !== projectionVersion) {
        return true;
      }
      return false;
    });
    this.handlers.length = 0;
    this.handlers.push(...filtered);
    return Promise.resolve(sdkOk(undefined));
  }

  lookup(
    eventType: EventTypeName,
    consumerGroup: string
  ): SdkAsyncResult<ProjectionHandlerRegistration[]> {
    const matched = this.handlers.filter(
      (h) =>
        h.identity.consumerGroup === consumerGroup && h.eventTypes.includes(eventType)
    );
    return Promise.resolve(sdkOk(matched));
  }

  list(projectionName?: string): SdkAsyncResult<ProjectionHandlerRegistration[]> {
    const result = projectionName
      ? this.handlers.filter((h) => h.identity.projectionName === projectionName)
      : [...this.handlers];
    return Promise.resolve(sdkOk(result));
  }

  size(): number {
    return this.handlers.length;
  }

  /** Synchronous bootstrap for factory wiring — validates then registers. */
  bootstrap(registration: ProjectionHandlerRegistration): readonly string[] {
    const errors = [
      ...validateProjectionIdentity(registration.identity),
      ...assertUniqueProjectionIdentity(
        this.handlers.map((h) => h.identity),
        registration.identity
      ),
    ];
    if (!registration.eventTypes.length) errors.push('eventTypes must not be empty');
    if (!registration.handlerVersion) errors.push('handlerVersion is required');
    if (!registration.handler) errors.push('handler is required');
    if (errors.length === 0) {
      this.handlers.push(registration);
    }
    return errors;
  }
}

export function createProjectionRegistry(): ProjectionRegistryPort {
  return new ProjectionRegistry();
}
