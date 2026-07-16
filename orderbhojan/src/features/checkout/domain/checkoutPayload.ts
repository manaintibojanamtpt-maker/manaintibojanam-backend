import { getLocationStoreAddress, buildDeliveryAddressLine } from '@bhojan/location-core';
import type { CartLine } from '@/features/cart/store/cartStore';
import type { CustomerLocation } from '@/features/location/domain/location.types';

export function buildCheckoutPayload(
  lines: readonly CartLine[],
  restaurantId: string,
  contextToken: string,
  activeLocation: CustomerLocation | null,
) {
  const coords = activeLocation?.coordinates
    ? { lat: activeLocation.coordinates.lat, lng: activeLocation.coordinates.lng }
    : { lat: 0, lng: 0 };
  const v2Address = getLocationStoreAddress();
  const addressLine =
    (v2Address ? buildDeliveryAddressLine(v2Address.text) : '') ||
    activeLocation?.displayLabel?.trim() ||
    '';
  const distanceKm = activeLocation?.serviceability?.distanceKm;

  return {
    restaurantId,
    contextToken,
    orderType: 'delivery' as const,
    lines: lines.map((line) => ({
      itemId: line.foodId,
      quantity: line.quantity,
    })),
    deliveryAddress: {
      lat: coords.lat,
      lng: coords.lng,
      ...(addressLine ? { addressLine1: addressLine, displayLabel: addressLine } : {}),
      ...(v2Address?.text?.flat ? { flat: v2Address.text.flat } : {}),
      ...(v2Address?.text?.building ? { building: v2Address.text.building } : {}),
      ...(v2Address?.text?.landmark ? { landmark: v2Address.text.landmark } : {}),
      ...(typeof distanceKm === 'number' ? { distanceKm } : {}),
    },
  };
}

export function buildCheckoutPrepareSignature(input: {
  readonly restaurantId: string;
  readonly contextToken: string;
  readonly lines: readonly CartLine[];
  readonly lat?: number;
  readonly lng?: number;
}): string {
  const lineSig = input.lines
    .map((line) => `${line.foodId}:${line.quantity}`)
    .sort()
    .join('|');
  const lat = input.lat?.toFixed(4) ?? '0';
  const lng = input.lng?.toFixed(4) ?? '0';
  return `${input.restaurantId}:${input.contextToken}:${lat},${lng}:${lineSig}`;
}
