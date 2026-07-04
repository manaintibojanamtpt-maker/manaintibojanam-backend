import { getMarketplaceApiClient } from '@/marketplace-api';
import type {
  DeliveryZoneResult,
  DistanceResult,
  PincodeValidationResult,
  ReverseGeocodeResult,
  ServiceabilityResult,
} from '@/types/marketplace-location';

export async function reverseGeocode(params: {
  lat: number;
  lng: number;
  language?: string;
}): Promise<ReverseGeocodeResult> {
  const client = getMarketplaceApiClient();
  return client.locationReverseGeocode(params);
}

export async function validatePincode(params: {
  pincode: string;
  stateCode?: string;
}): Promise<PincodeValidationResult> {
  const client = getMarketplaceApiClient();
  return client.locationValidatePincode(params);
}

export async function checkServiceability(body: {
  lat: number;
  lng: number;
  restaurantId?: string;
  contextToken?: string;
  orderType?: 'delivery' | 'pickup';
}): Promise<ServiceabilityResult> {
  const client = getMarketplaceApiClient();
  return client.locationServiceability(body);
}

export async function checkDeliveryZone(body: {
  lat: number;
  lng: number;
  restaurantId?: string;
}): Promise<DeliveryZoneResult> {
  const client = getMarketplaceApiClient();
  return client.locationDeliveryZone(body);
}

export async function calculateDistance(body: {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}): Promise<DistanceResult> {
  const client = getMarketplaceApiClient();
  return client.locationDistance(body);
}
