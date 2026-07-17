import { haversineKm, isImplausibleCustomerDistance } from './tenantProjectionHelpers.js';

/** Distances below this are shown as 0.0 km only when genuinely that close. */
export const MIN_DISPLAY_DISTANCE_KM = 0.1;

/** ~11 m — treat as identical coords (geocoding / default-coord collision). */
const COORD_MATCH_EPSILON = 1e-4;

export function isValidGeoCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

export function areCoordsNearlyEqual(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): boolean {
  return (
    Math.abs(lat1 - lat2) < COORD_MATCH_EPSILON && Math.abs(lng1 - lng2) < COORD_MATCH_EPSILON
  );
}

export function roundDisplayDistanceKm(distanceKm: number): number {
  return Math.round(distanceKm * 10) / 10;
}

/** Authoritative straight-line distance (km) from delivery coords to kitchen. */
export function computeCustomerDistanceKm(
  customerLat: number,
  customerLng: number,
  kitchenLat: number,
  kitchenLng: number,
): number | undefined {
  if (!isValidGeoCoord(customerLat, customerLng) || !isValidGeoCoord(kitchenLat, kitchenLng)) {
    return undefined;
  }
  if (areCoordsNearlyEqual(customerLat, customerLng, kitchenLat, kitchenLng)) {
    return undefined;
  }
  const raw = haversineKm(customerLat, customerLng, kitchenLat, kitchenLng);
  if (!Number.isFinite(raw) || isImplausibleCustomerDistance(raw)) {
    return undefined;
  }
  return raw;
}

/** Rounded km for API/display — suppresses misleading 0.0 from rounding or coord bugs. */
export function toDisplayDistanceKm(rawKm: number | undefined): number | undefined {
  if (rawKm == null || !Number.isFinite(rawKm)) return undefined;
  const rounded = roundDisplayDistanceKm(rawKm);
  if (rounded === 0) {
    return rawKm < MIN_DISPLAY_DISTANCE_KM ? 0 : MIN_DISPLAY_DISTANCE_KM;
  }
  return rounded;
}

export function resolveCustomerDistanceKm(
  customer: { lat: number; lng: number },
  kitchen: { lat: number; lng: number },
): { rawKm: number | undefined; displayKm: number | undefined } {
  const rawKm = computeCustomerDistanceKm(customer.lat, customer.lng, kitchen.lat, kitchen.lng);
  return { rawKm, displayKm: toDisplayDistanceKm(rawKm) };
}
