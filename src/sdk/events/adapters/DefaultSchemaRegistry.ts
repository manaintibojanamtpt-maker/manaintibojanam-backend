/**
 * EventSDK — default schema registry (M6 PR-2 infrastructure).
 */

import type { ExtendedSchemaRegistryPort } from '../contracts/infrastructurePorts';
import type { SchemaRegistryPort, EventSchemaDefinition } from '../contracts/ports';
import type { EventTypeName, SchemaVersion } from '../types/branded';
import type { EventVersion } from '../dto/EventVersion';
import type { ClockPort } from '../contracts/ports';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import { validateSchemaCompatibility } from '../validation/validateSchemaCompatibility';

export class DefaultSchemaRegistry implements ExtendedSchemaRegistryPort, SchemaRegistryPort {
  private readonly schemas = new Map<string, EventSchemaDefinition>();

  constructor(private readonly clock: ClockPort) {}

  private key(type: EventTypeName, version: EventVersion): string {
    return `${type}@${version}`;
  }

  register(
    definition: Omit<EventSchemaDefinition, 'registeredAt'>
  ): SdkAsyncResult<EventSchemaDefinition> {
    const entry: EventSchemaDefinition = {
      ...definition,
      registeredAt: this.clock.now(),
    };
    this.schemas.set(this.key(definition.type, definition.version), entry);
    return Promise.resolve(sdkOk(entry));
  }

  resolve(
    type: EventTypeName,
    version: EventVersion
  ): SdkAsyncResult<EventSchemaDefinition | null> {
    return Promise.resolve(sdkOk(this.schemas.get(this.key(type, version)) ?? null));
  }

  list(type: EventTypeName): SdkAsyncResult<EventSchemaDefinition[]> {
    const prefix = `${type}@`;
    const entries = [...this.schemas.values()].filter((s) =>
      this.key(s.type, s.version).startsWith(prefix)
    );
    return Promise.resolve(sdkOk(entries));
  }

  async validateCompatibility(
    type: EventTypeName,
    version: EventVersion,
    schemaVersion: SchemaVersion
  ): SdkAsyncResult<boolean> {
    const resolved = await this.resolve(type, version);
    if (!resolved.ok) return resolved;
    return validateSchemaCompatibility(resolved.value, schemaVersion);
  }
}

export function createDefaultSchemaRegistry(clock: ClockPort): ExtendedSchemaRegistryPort {
  return new DefaultSchemaRegistry(clock);
}
