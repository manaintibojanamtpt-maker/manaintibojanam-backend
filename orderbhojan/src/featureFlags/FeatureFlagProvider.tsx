import React, { createContext, useContext, useMemo } from 'react';
import { loadFeatureFlags, isFeatureEnabled, type FeatureFlagKey, type FeatureFlagMap } from './flags';
import { trackEvent } from '@/telemetry';

interface FeatureFlagContextValue {
  readonly flags: FeatureFlagMap;
  isEnabled(key: FeatureFlagKey): boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

export function FeatureFlagProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<FeatureFlagContextValue>(() => {
    const flags = loadFeatureFlags();
    return {
      flags,
      isEnabled(key: FeatureFlagKey) {
        const enabled = isFeatureEnabled(flags, key);
        trackEvent({
          name: 'feature_flag_evaluated',
          properties: { key, enabled },
        });
        return enabled;
      },
    };
  }, []);

  return (
    <FeatureFlagContext.Provider value={value}>{children}</FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags(): FeatureFlagContextValue {
  const ctx = useContext(FeatureFlagContext);
  if (!ctx) {
    throw new Error('useFeatureFlags must be used within FeatureFlagProvider');
  }
  return ctx;
}

export function useFeatureFlag(key: FeatureFlagKey): boolean {
  return useFeatureFlags().isEnabled(key);
}
