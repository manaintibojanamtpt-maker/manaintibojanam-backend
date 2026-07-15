export type LocationTelemetryEvent =
  | 'location.permission_denied'
  | 'location.timeout'
  | 'location.unavailable'
  | 'location.reverse_failure'
  | 'location.out_of_radius'
  | 'location.detect_success'
  | 'location.confirm_success';

export type LocationTelemetryPayload = {
  event: LocationTelemetryEvent;
  timestamp: number;
  app?: 'founder' | 'marketplace';
  lat?: number;
  lng?: number;
  kitchenId?: string;
  distanceKm?: number;
  message?: string;
  code?: string;
};

export type LocationTelemetrySink = (payload: LocationTelemetryPayload) => void;

let telemetrySink: LocationTelemetrySink | null = null;

export function setLocationTelemetrySink(sink: LocationTelemetrySink | null): void {
  telemetrySink = sink;
}

export function emitLocationTelemetry(
  event: LocationTelemetryEvent,
  details?: Omit<LocationTelemetryPayload, 'event' | 'timestamp'>,
): void {
  const payload: LocationTelemetryPayload = {
    event,
    timestamp: Date.now(),
    ...details,
  };

  if (telemetrySink) {
    telemetrySink(payload);
    return;
  }

  if (typeof console !== 'undefined') {
    const level = event.includes('failure') || event.includes('denied') || event.includes('timeout') || event.includes('out_of_radius')
      ? 'warn'
      : 'info';
    console[level]('[location-telemetry]', payload);
  }
}

export function trackGeolocationFailure(code: string, message: string, app?: 'founder' | 'marketplace'): void {
  if (code === 'PERMISSION_DENIED') {
    emitLocationTelemetry('location.permission_denied', { code, message, app });
  } else if (code === 'TIMEOUT') {
    emitLocationTelemetry('location.timeout', { code, message, app });
  } else {
    emitLocationTelemetry('location.unavailable', { code, message, app });
  }
}

export function trackReverseGeocodeFailure(message: string, app?: 'founder' | 'marketplace'): void {
  emitLocationTelemetry('location.reverse_failure', { message, app });
}

export function trackOutOfRadius(
  kitchenId: string,
  distanceKm: number,
  lat: number,
  lng: number,
  app?: 'founder' | 'marketplace',
): void {
  emitLocationTelemetry('location.out_of_radius', {
    kitchenId,
    distanceKm,
    lat,
    lng,
    app,
  });
}
