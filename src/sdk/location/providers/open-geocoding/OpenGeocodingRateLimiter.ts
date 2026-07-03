/**
 * LocationSDK — Open Geocoding rate limiter hook (M2 PR-8).
 * Default enforces Nominatim public policy (~1 request per second).
 */

import { sdkOk } from '../../../core/resultHelpers';
import type { OpenGeocodingRateLimiterPort } from './OpenGeocodingPorts';

export class IntervalOpenGeocodingRateLimiter implements OpenGeocodingRateLimiterPort {
  private nextAllowedAtMs = 0;

  constructor(private readonly minIntervalMs: number) {}

  async acquire() {
    const now = Date.now();
    const waitMs = this.nextAllowedAtMs - now;
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    this.nextAllowedAtMs = Date.now() + this.minIntervalMs;
    return sdkOk(undefined);
  }

  reset(): void {
    this.nextAllowedAtMs = 0;
  }
}

export class NoOpOpenGeocodingRateLimiter implements OpenGeocodingRateLimiterPort {
  async acquire() {
    return sdkOk(undefined);
  }
}

export function createIntervalOpenGeocodingRateLimiter(
  minIntervalMs: number
): IntervalOpenGeocodingRateLimiter {
  return new IntervalOpenGeocodingRateLimiter(minIntervalMs);
}

export function createNoOpOpenGeocodingRateLimiter(): NoOpOpenGeocodingRateLimiter {
  return new NoOpOpenGeocodingRateLimiter();
}
