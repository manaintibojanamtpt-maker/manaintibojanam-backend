import { getAppConfig } from '@/config';
import { registerAnalyticsSink, type AnalyticsEvent } from './analytics';

function buildClientErrorPayload(event: AnalyticsEvent): { error: string; info: Record<string, unknown> } {
  const message =
    typeof event.properties?.message === 'string'
      ? event.properties.message
      : 'Client error';

  return {
    error: message,
    info: {
      route: typeof window !== 'undefined' ? window.location.pathname : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      correlationId: event.correlationId,
      event: event.name,
      ...event.properties,
    },
  };
}

function postClientError(payload: { error: string; info: Record<string, unknown> }): void {
  const config = getAppConfig();
  const url = `${config.marketplaceApiBaseUrl.replace(/\/$/, '')}/api/client-errors`;

  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Best-effort telemetry — never throw back to callers.
  });
}

export function registerClientErrorTelemetrySink(): () => void {
  return registerAnalyticsSink((event: AnalyticsEvent) => {
    if (event.name !== 'api_error') return;

    const payload = buildClientErrorPayload(event);

    if (import.meta.env.DEV) {
      console.error('[OrderBhojan:client-error]', payload);
      return;
    }

    postClientError(payload);
  });
}
