/**
 * M4 PR-8 — marketplace search analytics (presentation layer).
 */

import type { MarketplaceSearchFilterState, MarketplaceSearchSort } from './searchFilterTypes';

export type SearchAnalyticsEventType =
  | 'SEARCH_STARTED'
  | 'SEARCH_COMPLETED'
  | 'SEARCH_FILTER_APPLIED'
  | 'SEARCH_RESULT_CLICKED'
  | 'SEARCH_CLEARED'
  | 'SEARCH_RETRY'
  | 'SEARCH_NO_RESULTS'
  | 'SEARCH_AUTOCOMPLETE_OPENED'
  | 'SEARCH_AUTOCOMPLETE_SELECTED'
  | 'SEARCH_SUGGESTION_CLICKED'
  | 'SEARCH_RECENT_SELECTED'
  | 'SEARCH_POPULAR_SELECTED';

export interface SearchAnalyticsPayload {
  readonly correlationId?: string;
  readonly query?: string;
  readonly filters?: MarketplaceSearchFilterState;
  readonly sort?: MarketplaceSearchSort;
  readonly resultCount?: number;
  readonly tenantId?: string;
  readonly errorCode?: string;
  readonly prefix?: string;
  readonly label?: string;
  readonly source?: string;
  readonly kind?: string;
}

export interface SearchAnalyticsEvent {
  readonly type: SearchAnalyticsEventType;
  readonly timestamp: number;
  readonly payload: SearchAnalyticsPayload;
}

const MAX_ANALYTICS_BUFFER = 100;
const analyticsBuffer: SearchAnalyticsEvent[] = [];

export const getSearchAnalyticsBuffer = (): readonly SearchAnalyticsEvent[] => [...analyticsBuffer];

export const clearSearchAnalyticsBuffer = (): void => {
  analyticsBuffer.length = 0;
};

const logToTelemetry = (event: SearchAnalyticsEvent): void => {
  if (typeof import.meta === 'undefined' || !import.meta.env) {
    return;
  }

  void import('../../core/reliability/TelemetryService')
    .then(({ TelemetryService }) => {
      TelemetryService.logInfo(`SearchAnalytics:${event.type}`, {
        context: 'MarketplaceSearchAnalytics',
        ...event.payload,
      });
    })
    .catch(() => {
      // Telemetry is best-effort — never block search flows.
    });
};

export const trackSearchAnalytics = (
  type: SearchAnalyticsEventType,
  payload: SearchAnalyticsPayload = {}
): SearchAnalyticsEvent => {
  const event: SearchAnalyticsEvent = {
    type,
    timestamp: Date.now(),
    payload,
  };

  analyticsBuffer.push(event);
  if (analyticsBuffer.length > MAX_ANALYTICS_BUFFER) {
    analyticsBuffer.shift();
  }

  logToTelemetry(event);

  return event;
};
