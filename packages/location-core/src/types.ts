export type CoordinateSource = 'gps' | 'saved' | 'search' | 'manual';

export type Coordinates = {
  lat: number;
  lng: number;
  accuracyM?: number;
  source: CoordinateSource;
  capturedAt: number;
};

export type AddressText = {
  flat?: string;
  building?: string;
  landmark?: string;
  road?: string;
  suburb?: string;
  area?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  country?: string;
  formatted: string;
  shortLabel: string;
};

export type ServiceabilityReason = 'OUT_OF_RADIUS' | 'NO_KITCHEN_COORDS' | 'OK';

export type Serviceability = {
  isServiceable: boolean;
  distanceKm: number;
  deliveryFee: number;
  currency: 'INR';
  kitchenId?: string;
  zoneId?: string;
  reason?: ServiceabilityReason;
};

export type AddressPrecision = 'exact' | 'nearby' | 'approx';

export type DeliveryAddressMeta = {
  provider: 'nominatim';
  precision: AddressPrecision;
  cacheKey?: string;
  geohash?: string;
  placeId?: number | string;
  osmType?: string;
  osmId?: number | string;
  capturedAt: number;
};

export type DeliveryAddressV2 = {
  version: 2;
  coordinates: Coordinates;
  text: AddressText;
  serviceability?: Serviceability;
  meta: DeliveryAddressMeta;
};

export const DELIVERY_ADDRESS_VERSION = 2 as const;

export const STORAGE_KEYS = {
  address: 'bhojanos_delivery_address_v2',
  session: 'bhojanos_delivery_session_v2',
  legacyFounder: 'mana-delivery-state',
  legacyFounderSession: 'bhos-customer-location-session',
  legacyObSession: 'ob-location-session-v1',
  legacyObGuest: 'ob_guest_location_v1',
} as const;
