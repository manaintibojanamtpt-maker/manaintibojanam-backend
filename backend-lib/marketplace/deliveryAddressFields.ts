function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function composeStructuredAddressLine(input: Record<string, unknown>): string | undefined {
  const flat = readString(input.flat);
  const building = readString(input.building);
  const landmark = readString(input.landmark);
  const area = readString(input.area) ?? readString(input.suburb);
  const city = readString(input.city) ?? readString(input.cityName);
  const detailParts = [flat, building, landmark].filter(Boolean);
  const areaParts = [area, city].filter(Boolean);

  if (detailParts.length > 0) {
    const line = detailParts.join(', ');
    return areaParts.length > 0 ? `${line}, ${areaParts.join(', ')}` : line;
  }

  return undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return value;
}

export interface NormalizedDeliveryAddressFields {
  readonly address: string | null;
  readonly deliveryAddress: {
    readonly addressLine1: string;
    readonly city?: string;
    readonly lat?: number;
    readonly lng?: number;
    readonly distanceKm?: number;
    readonly displayLabel?: string;
  } | null;
}

export function normalizeDeliveryAddressFields(
  input?: Record<string, unknown> | null,
): NormalizedDeliveryAddressFields {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { address: null, deliveryAddress: null };
  }

  const addressLine1 =
    readString(input.addressLine1) ??
    composeStructuredAddressLine(input) ??
    readString(input.displayLabel) ??
    readString(input.formattedAddress) ??
    readString(input.fullAddress) ??
    readString(input.address);

  const city = readString(input.city) ?? readString(input.cityName);
  const lat = readNumber(input.lat);
  const lng = readNumber(input.lng);
  const distanceKm = readNumber(input.distanceKm);

  if (!addressLine1 && lat === undefined && lng === undefined) {
    return { address: null, deliveryAddress: null };
  }

  const deliveryAddress = {
    addressLine1: addressLine1 ?? (lat !== undefined && lng !== undefined ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : 'Delivery location'),
    ...(city ? { city } : {}),
    ...(lat !== undefined ? { lat } : {}),
    ...(lng !== undefined ? { lng } : {}),
    ...(distanceKm !== undefined ? { distanceKm } : {}),
    ...(addressLine1 ? { displayLabel: addressLine1 } : {}),
  };

  return {
    address: addressLine1 ?? deliveryAddress.addressLine1,
    deliveryAddress,
  };
}

export function resolveOrderAddressText(
  address: unknown,
  deliveryAddress: unknown,
): string | undefined {
  const normalized = normalizeDeliveryAddressFields(
    (deliveryAddress && typeof deliveryAddress === 'object' && !Array.isArray(deliveryAddress)
      ? deliveryAddress
      : address && typeof address === 'object' && !Array.isArray(address)
        ? (address as Record<string, unknown>)
        : address
          ? { address: address }
          : null) as Record<string, unknown> | null,
  );
  return normalized.address ?? undefined;
}
