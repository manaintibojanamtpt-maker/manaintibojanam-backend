/**
 * Discovery domain — distance calculation (M3 PR-4).
 * Parity with src/lib/deliveryFee.ts: Haversine × 1.2 road factor.
 */

import type { GeoPoint } from '../../../sdk/location/dto/geo';

export const DISCOVERY_ROAD_FACTOR = 1.2;
const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export function isValidGeoPoint(point: GeoPoint | undefined | null): boolean {
  if (!point) return false;
  const { lat, lng } = point;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  return true;
}

export function calculateDiscoveryDistanceKm(from: GeoPoint, to: GeoPoint): number {
  const dLat = toRadians(to.lat - from.lat);
  const dLon = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c * DISCOVERY_ROAD_FACTOR;
}
