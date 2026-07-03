/**
 * EventSDK — default UUID generator.
 */

import type { UuidPort } from '../contracts/ports';

export class DefaultUuidGenerator implements UuidPort {
  generate(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}

export function createDefaultUuid(): UuidPort {
  return new DefaultUuidGenerator();
}
