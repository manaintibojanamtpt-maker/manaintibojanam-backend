/**
 * LocationSDK — map intelligence provider contract (M2 PR-7).
 * No MapLibre, DOM, or React in PR-7 — stub only.
 */

import type { SdkResult } from '../../core/result';
import type { MapProviderKind } from '../types/branded';
import type { GeoPoint } from '../dto/geo';
import type { MapPinOptions, MapPinValidationResult, MapViewport } from '../dto/map';

export interface MapProvider {
  readonly kind: MapProviderKind;

  /** Default viewport for pin placement flows — no render side effects. */
  getDefaultViewport(options?: MapPinOptions): SdkResult<MapViewport>;

  /** Validate whether a pin may be placed at a coordinate — pure rules only. */
  validatePinPlacement(point: GeoPoint): SdkResult<MapPinValidationResult>;
}

export interface MapProviderFactory {
  create(options?: { kind?: MapProviderKind }): MapProvider;
}
