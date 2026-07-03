/**
 * LocationSDK — pure local geo computations (M2 PR-6).
 * No external providers; domain modules will own rules in future PRs.
 */

import type { SdkResult } from '../../core/result';
import { sdkError, sdkFail, sdkOk } from '../../core/resultHelpers';
import type { GeoPoint } from '../dto/geo';
import type { DistanceOptions, DistanceResult } from '../dto/geo';
import type { GeohashPrecision } from '../types/branded';

const EARTH_RADIUS_KM = 6371;
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export function computeHaversineDistanceKm(from: GeoPoint, to: GeoPoint): number {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function computeDistance(
  from: GeoPoint,
  to: GeoPoint,
  options?: DistanceOptions
): SdkResult<DistanceResult> {
  if (!Number.isFinite(from.lat) || !Number.isFinite(from.lng)) {
    return sdkFail(sdkError('VALIDATION', 'Invalid coordinates on origin point', { field: 'from' }));
  }
  if (!Number.isFinite(to.lat) || !Number.isFinite(to.lng)) {
    return sdkFail(sdkError('VALIDATION', 'Invalid coordinates on destination point', { field: 'to' }));
  }
  if (from.lat < -90 || from.lat > 90 || to.lat < -90 || to.lat > 90) {
    return sdkFail(sdkError('VALIDATION', 'Latitude must be between -90 and 90'));
  }
  if (from.lng < -180 || from.lng > 180 || to.lng < -180 || to.lng > 180) {
    return sdkFail(sdkError('VALIDATION', 'Longitude must be between -180 and 180'));
  }

  const roadFactor = options?.roadFactor ?? 1;
  if (roadFactor <= 0 || !Number.isFinite(roadFactor)) {
    return sdkFail(sdkError('VALIDATION', 'roadFactor must be a positive number'));
  }

  const straightLineKm = computeHaversineDistanceKm(from, to);
  const distanceKm = straightLineKm * roadFactor;

  return sdkOk({
    distanceKm,
    unit: 'km',
  });
}

export function encodeGeohashPoint(
  point: GeoPoint,
  precision: GeohashPrecision = 7
): SdkResult<string> {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
    return sdkFail(sdkError('VALIDATION', 'Invalid coordinates for geohash encode'));
  }
  if (point.lat < -90 || point.lat > 90 || point.lng < -180 || point.lng > 180) {
    return sdkFail(sdkError('VALIDATION', 'Coordinates out of WGS84 bounds'));
  }

  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;
  let hash = '';
  let bit = 0;
  let ch = 0;
  let isLng = true;

  while (hash.length < precision) {
    if (isLng) {
      const mid = (lngMin + lngMax) / 2;
      if (point.lng >= mid) {
        ch = ch | (1 << (4 - bit));
        lngMin = mid;
      } else {
        lngMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (point.lat >= mid) {
        ch = ch | (1 << (4 - bit));
        latMin = mid;
      } else {
        latMax = mid;
      }
    }

    isLng = !isLng;
    if (bit < 4) {
      bit += 1;
    } else {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return sdkOk(hash);
}

export function decodeGeohashPoint(hash: string): SdkResult<GeoPoint> {
  if (!hash || !/^[0123456789bcdefghjkmnpqrstuvwxyz]+$/i.test(hash)) {
    return sdkFail(sdkError('VALIDATION', 'Invalid geohash string', { geohash: hash }));
  }

  const normalized = hash.toLowerCase();
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;
  let isLng = true;

  for (const char of normalized) {
    const idx = BASE32.indexOf(char);
    if (idx === -1) {
      return sdkFail(sdkError('VALIDATION', 'Invalid geohash character', { geohash: hash }));
    }

    for (let bit = 4; bit >= 0; bit -= 1) {
      const mask = 1 << bit;
      if (isLng) {
        const mid = (lngMin + lngMax) / 2;
        if (idx & mask) {
          lngMin = mid;
        } else {
          lngMax = mid;
        }
      } else {
        const mid = (latMin + latMax) / 2;
        if (idx & mask) {
          latMin = mid;
        } else {
          latMax = mid;
        }
      }
      isLng = !isLng;
    }
  }

  return sdkOk({
    lat: (latMin + latMax) / 2,
    lng: (lngMin + lngMax) / 2,
  });
}
