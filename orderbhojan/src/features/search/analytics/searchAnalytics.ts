import type { SearchAnalyticsEvent } from '@/types/marketplace-search';

export interface SearchAnalyticsSink {
  track(event: SearchAnalyticsEvent): void;
}

export class InMemorySearchAnalytics implements SearchAnalyticsSink {
  readonly events: SearchAnalyticsEvent[] = [];

  track(event: SearchAnalyticsEvent): void {
    this.events.push(event);
  }

  clear(): void {
    this.events.length = 0;
  }
}

export const noopSearchAnalytics: SearchAnalyticsSink = {
  track: () => {},
};

let activeSink: SearchAnalyticsSink = noopSearchAnalytics;

export function setSearchAnalyticsSink(sink: SearchAnalyticsSink): void {
  activeSink = sink;
}

export function getSearchAnalyticsSink(): SearchAnalyticsSink {
  return activeSink;
}

export function trackSearchEvent(
  type: SearchAnalyticsEvent['type'],
  payload: Omit<SearchAnalyticsEvent, 'type' | 'timestamp'> = {},
): void {
  activeSink.track({
    type,
    ...payload,
    timestamp: new Date().toISOString(),
  });
}
