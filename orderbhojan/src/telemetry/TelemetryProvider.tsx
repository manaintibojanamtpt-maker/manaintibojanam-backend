import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { generateCorrelationId } from '@/utils';
import { trackEvent } from './analytics';
import { registerClientErrorTelemetrySink } from './clientErrorSink';
import { logger } from './logger';

export interface TelemetryContextValue {
  readonly correlationId: string;
  readonly log: typeof logger;
  readonly track: typeof trackEvent;
}

const TelemetryContext = createContext<TelemetryContextValue | null>(null);

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<TelemetryContextValue>(() => {
    const correlationId = generateCorrelationId();
    trackEvent({ name: 'app_boot', correlationId });
    return {
      correlationId,
      log: logger,
      track: trackEvent,
    };
  }, []);

  useEffect(() => registerClientErrorTelemetrySink(), []);

  return (
    <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>
  );
}

export function useTelemetry(): TelemetryContextValue {
  const ctx = useContext(TelemetryContext);
  if (!ctx) {
    throw new Error('useTelemetry must be used within TelemetryProvider');
  }
  return ctx;
}
