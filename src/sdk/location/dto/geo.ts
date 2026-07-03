/**
 * LocationSDK — geo primitives and geocoding DTOs.
 */

import type { Geohash, GeohashPrecision, GeoTimestamp } from '../types/branded';

export interface GeoPoint {
  readonly lat: number;
  readonly lng: number;
}

export interface GeoPointWithAccuracy extends GeoPoint {
  readonly accuracyM: number;
  readonly timestamp: GeoTimestamp;
}

export interface DistanceOptions {
  readonly unit?: 'km' | 'm';
  /** Road factor applied to straight-line distance (domain default: 1.2). */
  readonly roadFactor?: number;
}

export interface DistanceResult {
  readonly distanceKm: number;
  readonly unit: 'km';
}

export interface GeolocationOptions {
  readonly enableHighAccuracy?: boolean;
  readonly timeoutMs?: number;
  readonly maximumAgeMs?: number;
}

export interface LocationGeoJson {
  readonly type: 'Feature';
  readonly geometry: {
    readonly type: 'Point';
    readonly coordinates: readonly [number, number];
  };
  readonly properties: {
    readonly geohash: Geohash;
    readonly formattedAddress?: string;
  };
}

export interface GeohashEncodeInput {
  readonly point: GeoPoint;
  readonly precision?: GeohashPrecision;
}

export interface GeohashDecodeResult {
  readonly point: GeoPoint;
  readonly hash: Geohash;
}
