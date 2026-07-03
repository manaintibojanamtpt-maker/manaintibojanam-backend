/**
 * EventSDK — projection dispatcher (M6 PR-4).
 * Resolves handlers, version compatibility, event routing.
 */

import type {
  ProjectionDispatcherPort,
  ProjectionDispatchResult,
  ProjectionRegistryPort,
} from '../contracts/projectionPorts';
import type { EventEnvelope } from '../dto/EventEnvelope';
import type { SchemaRegistryPort } from '../contracts/ports';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import { validateVersionCompatibility } from '../validation/validateVersionCompatibility';
import type { ProjectionTelemetryHook } from './ProjectionTelemetry';
import { createProjectionTelemetryEmitter } from './ProjectionTelemetry';

export interface ProjectionDispatcherOptions {
  readonly registry: ProjectionRegistryPort;
  readonly schemaRegistry?: SchemaRegistryPort;
  readonly onTelemetry?: ProjectionTelemetryHook;
}

export class ProjectionDispatcher implements ProjectionDispatcherPort {
  constructor(private readonly options: ProjectionDispatcherOptions) {}

  async dispatch<TPayload>(
    envelope: EventEnvelope<TPayload>,
    consumerGroup: string
  ): SdkAsyncResult<ProjectionDispatchResult> {
    const lookup = await this.options.registry.lookup(envelope.header.type, consumerGroup);
    if (!lookup.ok) return lookup;

    let matchedHandlers = lookup.value.length;
    let invokedHandlers = 0;
    let failedHandlers = 0;

    if (this.options.schemaRegistry) {
      const schema = await this.options.schemaRegistry.resolve(
        envelope.header.type,
        envelope.header.version
      );
      if (schema.ok && schema.value) {
        const versionCheck = validateVersionCompatibility(
          envelope.header.version,
          schema.value.version
        );
        if (!versionCheck.ok) {
          return {
            ok: false,
            error: versionCheck.error,
          };
        }
      }
    }

    for (const registration of lookup.value) {
      const { identity } = registration;
      const telemetry = createProjectionTelemetryEmitter(
        this.options.onTelemetry,
        'dispatch',
        identity.projectionName,
        identity.consumerGroup
      );
      telemetry.handlerInvoked(envelope.header.type, envelope.header.eventId);

      const result = await registration.handler.handle(envelope, {
        projectionName: identity.projectionName,
        projectionVersion: identity.projectionVersion,
        consumerGroup: identity.consumerGroup,
        handlerVersion: registration.handlerVersion,
      });

      if (result.ok) {
        invokedHandlers += 1;
      } else {
        failedHandlers += 1;
        telemetry.handlerFailed(result.error.code, envelope.header.type);
      }
    }

    return sdkOk({ matchedHandlers, invokedHandlers, failedHandlers });
  }
}

export function createProjectionDispatcher(
  options: ProjectionDispatcherOptions
): ProjectionDispatcherPort {
  return new ProjectionDispatcher(options);
}
