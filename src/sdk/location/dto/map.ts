/**
 * LocationSDK — map intelligence DTOs (contracts only; no MapLibre in PR-7).
 */

import type { GeoPoint } from './geo';

export interface MapViewport {
  readonly center: GeoPoint;
  readonly zoom: number;
}

export interface MapPinOptions {
  readonly draggable?: boolean;
  readonly initialCenter?: GeoPoint;
  readonly initialZoom?: number;
}

export interface MapPinValidationResult {
  readonly point: GeoPoint;
  readonly allowed: boolean;
  readonly reason?: string;
}
