import { roadDistanceKm } from './tenantProjectionHelpers.js';

export function reverseGeocodeMarketplace(lat: number, lng: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw Object.assign(new Error('lat and lng are required'), { statusCode: 400 });
  }

  const label =
    lat > 17 && lat < 18 && lng > 78 && lng < 79
      ? 'Gachibowli, Hyderabad'
      : lat > 18 && lat < 19 && lng > 72 && lng < 74
        ? 'Koregaon Park, Pune'
        : 'Demo Locality, India';

  return {
    displayLabel: label,
    hints: {
      cityName: label.split(',')[1]?.trim() ?? 'India',
      areaName: label.split(',')[0]?.trim(),
      pincode: lat > 17 && lat < 18 ? '500032' : '411001',
    },
    confidence: 'high' as const,
  };
}

export function validateMarketplacePincode(pincode: string, _stateCode?: string) {
  const normalized = String(pincode ?? '').trim();
  const valid = /^[1-9][0-9]{5}$/.test(normalized);
  return {
    valid,
    stateCode: normalized.startsWith('5') ? 'TS' : valid ? 'MH' : undefined,
    districtName: normalized.startsWith('5') ? 'Hyderabad' : valid ? 'Pune' : undefined,
    cityName: normalized.startsWith('5') ? 'Hyderabad' : valid ? 'Pune' : undefined,
    areas: valid ? [{ areaCode: 'demo-area', areaName: 'Demo Area' }] : [],
    message: valid ? undefined : 'Invalid pincode format',
  };
}

export function checkMarketplaceServiceability(body: {
  lat: number;
  lng: number;
  restaurantCoords?: { lat: number; lng: number };
  maxRadiusKm?: number;
}) {
  const delivery = body.lat !== 0 && body.lng !== 0;
  let distanceKm: number | undefined;
  if (delivery && body.restaurantCoords) {
    distanceKm = Math.round(roadDistanceKm(body.lat, body.lng, body.restaurantCoords.lat, body.restaurantCoords.lng) * 10) / 10;
    if (body.maxRadiusKm != null && distanceKm > body.maxRadiusKm) {
      return {
        delivery: false,
        pickup: true,
        message: 'Outside delivery area for this restaurant',
        distanceKm,
      };
    }
  }

  return {
    delivery,
    pickup: true,
    message: delivery ? 'Delivery available in your area' : 'Location required',
    distanceKm: distanceKm ?? (delivery ? 3.2 : undefined),
    etaMinutes: delivery ? { min: 25, max: 35 } : undefined,
  };
}

export function checkMarketplaceDeliveryZone(body: { lat: number; lng: number; maxRadiusKm?: number }) {
  return {
    inZone: body.lat !== 0 && body.lng !== 0,
    zoneLabel: 'Standard delivery',
    maxRadiusKm: body.maxRadiusKm ?? 8,
  };
}

export function computeMarketplaceDistance(body: {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}) {
  const distanceKm = roadDistanceKm(
    body.origin.lat,
    body.origin.lng,
    body.destination.lat,
    body.destination.lng,
  );
  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    durationMinutes: { min: 20, max: 40 },
  };
}
