/**
 * M2 PR-10 — Customer canonical location (presentation layer).
 */

/** GPS-detected customer location after reverse geocoding. */
export interface CustomerCanonicalLocation {
  readonly country: 'IN';
  readonly stateName?: string;
  readonly districtName?: string;
  readonly cityName?: string;
  readonly localityName?: string;
  readonly pincode?: string;
  readonly street?: string;
  readonly lat: number;
  readonly lng: number;
  readonly accuracyM: number;
  readonly geohash: string;
  readonly formattedAddress: string;
  readonly coordinateSource: 'gps';
  readonly detectedAt: number;
}

export interface CustomerLocationSessionRecord {
  readonly location: CustomerCanonicalLocation;
  readonly savedAt: number;
}
