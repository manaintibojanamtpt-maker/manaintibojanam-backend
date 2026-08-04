import { getAppConfig } from '@/config';
import { logger } from './logger';

export type AnalyticsEventName =
  | 'app_boot'
  | 'app_ready'
  | 'api_request'
  | 'api_error'
  | 'feature_flag_evaluated'
  | 'auth_state_changed'
  | 'native_track_open'
  | 'native_track_fallback_hybrid'
  | 'order_track_status_change'
  | 'push_open_track'
  | 'cloud_tts_fallback';

export interface AnalyticsEvent {
  readonly name: AnalyticsEventName;
  readonly properties?: Record<string, string | number | boolean | null>;
  readonly correlationId?: string;
}

type AnalyticsSink = (event: AnalyticsEvent) => void;

const sinks: AnalyticsSink[] = [];

export function registerAnalyticsSink(sink: AnalyticsSink): () => void {
  sinks.push(sink);
  return () => {
    const index = sinks.indexOf(sink);
    if (index >= 0) sinks.splice(index, 1);
  };
}

export function trackEvent(event: AnalyticsEvent): void {
  const config = getAppConfig();
  if (!config.features.analyticsEnabled && event.name !== 'app_boot') {
    return;
  }

  logger.debug(`analytics:${event.name}`, {
    correlationId: event.correlationId,
    ...event.properties,
  });

  for (const sink of sinks) {
    try {
      sink(event);
    } catch (error) {
      logger.warn('Analytics sink failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export function trackError(error: unknown, context?: Record<string, unknown>): void {
  trackEvent({
    name: 'api_error',
    properties: {
      message: error instanceof Error ? error.message : String(error),
      ...context,
    },
  });
}
