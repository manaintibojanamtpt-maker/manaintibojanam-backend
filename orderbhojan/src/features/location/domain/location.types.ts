export type CountryCode = 'IN';

export type GeoCoordinateSource = 'gps' | 'map_pin' | 'geocode' | 'manual';

export interface GeoCoordinates {
  readonly lat: number;
  readonly lng: number;
  readonly accuracyM?: number;
  readonly source: GeoCoordinateSource;
  readonly capturedAt: string;
}

export interface IndiaAddress {
  readonly country: CountryCode;
  readonly stateCode: string;
  readonly stateName: string;
  readonly districtCode: string;
  readonly districtName: string;
  readonly cityCode: string;
  readonly cityName: string;
  readonly areaCode: string;
  readonly areaName: string;
  readonly pincode: string;
  readonly street: string;
  readonly landmark?: string;
  readonly coordinates: GeoCoordinates;
  readonly geohash?: string;
  readonly formattedAddress?: string;
}

export type AddressLabel = 'home' | 'work' | 'other';

export interface SavedAddress {
  readonly id: string;
  readonly label: AddressLabel;
  readonly customLabel?: string;
  readonly isDefault: boolean;
  readonly address: IndiaAddress;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type LocationSessionKind = 'session' | 'saved';

export interface ServiceabilityHint {
  readonly status: 'unknown' | 'serviceable' | 'unserviceable' | 'pending';
  readonly message?: string;
  readonly checkedAt?: string;
  readonly distanceKm?: number;
}

export interface CustomerLocation {
  readonly kind: LocationSessionKind;
  readonly coordinates: GeoCoordinates;
  readonly displayLabel: string;
  readonly savedAddressId?: string;
  readonly serviceability?: ServiceabilityHint;
}

export interface GuestLocationPersisted {
  readonly version: 1;
  readonly coordinates: GeoCoordinates;
  readonly displayLabel: string;
}

export type GeolocationPermissionState = 'idle' | 'prompting' | 'granted' | 'denied' | 'unavailable';

export type LocationUiStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface LocationUiError {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
}

export interface RecentLocationEntry {
  readonly id: string;
  readonly displayLabel: string;
  readonly coordinates: GeoCoordinates;
  readonly usedAt: string;
}
