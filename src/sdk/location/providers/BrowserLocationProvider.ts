/**
 * LocationSDK — browser geolocation provider contract (M2 PR-7).
 * No navigator.geolocation calls in PR-7 — stub only.
 */

import type { SdkAsyncResult, SdkResult } from '../../core/result';
import type { BrowserLocationProviderKind } from '../types/branded';
import type { GeoPointWithAccuracy, GeolocationOptions } from '../dto/geo';

export interface BrowserLocationProvider {
  readonly kind: BrowserLocationProviderKind;

  /** Whether the runtime exposes geolocation (stub returns false without DOM access). */
  isSupported(): SdkResult<boolean>;

  detectCurrentLocation(options?: GeolocationOptions): SdkAsyncResult<GeoPointWithAccuracy>;
}

export interface BrowserLocationProviderFactory {
  create(options?: { kind?: BrowserLocationProviderKind }): BrowserLocationProvider;
}
