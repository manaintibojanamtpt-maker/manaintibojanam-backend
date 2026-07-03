/**
 * EventSDK — in-memory schema registry (M6 PR-1 dev/test only).
 * Provider-neutral — no external dependencies.
 */

import type { SchemaRegistryPort, EventSchemaDefinition } from '../contracts/ports';
import type { EventTypeName } from '../types/branded';
import type { EventVersion } from '../dto/EventVersion';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';

export class InMemorySchemaRegistry implements SchemaRegistryPort {
  private readonly schemas = new Map<string, EventSchemaDefinition>();

  private key(type: EventTypeName, version: EventVersion): string {
    return `${type}@${version}`;
  }

  register(
    definition: Omit<EventSchemaDefinition, 'registeredAt'>
  ): SdkAsyncResult<EventSchemaDefinition> {
    const entry: EventSchemaDefinition = {
      ...definition,
      registeredAt: new Date().toISOString(),
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
}

export function createInMemorySchemaRegistry(): SchemaRegistryPort {
  return new InMemorySchemaRegistry();
}
