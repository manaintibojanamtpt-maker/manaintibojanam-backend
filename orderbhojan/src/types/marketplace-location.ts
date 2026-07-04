import type { GeoCoordinates } from '@/features/location/domain/location.types';

export interface ReverseGeocodeResult {
  readonly displayLabel: string;
  readonly hints?: {
    readonly stateName?: string;
    readonly cityName?: string;
    readonly areaName?: string;
    readonly pincode?: string;
  };
  readonly confidence: 'high' | 'medium' | 'low';
}

export interface PincodeValidationResult {
  readonly valid: boolean;
  readonly stateCode?: string;
  readonly districtName?: string;
  readonly cityName?: string;
  readonly areas?: { readonly areaCode: string; readonly areaName: string }[];
  readonly message?: string;
}

export interface ServiceabilityResult {
  readonly delivery: boolean;
  readonly pickup: boolean;
  readonly message?: string;
  readonly distanceKm?: number;
  readonly etaMinutes?: { readonly min: number; readonly max: number };
}

export interface DeliveryZoneResult {
  readonly inZone: boolean;
  readonly zoneLabel?: string;
  readonly maxRadiusKm?: number;
}

export interface DistanceResult {
  readonly distanceKm: number;
  readonly durationMinutes?: { readonly min: number; readonly max: number };
}

export interface LocationApiCoords {
  readonly lat: number;
  readonly lng: number;
}

export function coordsFromGeo(c: GeoCoordinates): LocationApiCoords {
  return { lat: c.lat, lng: c.lng };
}
