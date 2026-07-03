/**
 * Event domain — type registry (pure, M6 PR-1).
 */

import type { SchemaRegistrationInput } from '../shared/EventTypes';

export interface RegisteredSchema {
  readonly type: string;
  readonly version: string;
  readonly schemaVersion: string;
  readonly jsonSchema?: Readonly<Record<string, unknown>>;
  readonly registeredAt: string;
}

export class EventTypeRegistry {
  private readonly schemas = new Map<string, RegisteredSchema>();

  private key(type: string, version: string): string {
    return `${type}@${version}`;
  }

  register(input: SchemaRegistrationInput, registeredAt: string): RegisteredSchema {
    const entry: RegisteredSchema = { ...input, registeredAt };
    this.schemas.set(this.key(input.type, input.version), entry);
    return entry;
  }

  resolve(type: string, version: string): RegisteredSchema | undefined {
    return this.schemas.get(this.key(type, version));
  }

  list(type: string): RegisteredSchema[] {
    const prefix = `${type}@`;
    return [...this.schemas.entries()]
      .filter(([k]) => k.startsWith(prefix))
      .map(([, v]) => v);
  }

  size(): number {
    return this.schemas.size;
  }
}

export function createEventTypeRegistry(): EventTypeRegistry {
  return new EventTypeRegistry();
}
