/**
 * EventSDK — default clock (ISO-8601 UTC).
 */

import type { ClockPort } from '../contracts/ports';

export class DefaultClock implements ClockPort {
  now(): string {
    return new Date().toISOString();
  }
}

export function createDefaultClock(): ClockPort {
  return new DefaultClock();
}
