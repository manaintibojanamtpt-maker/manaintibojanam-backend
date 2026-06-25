import { EnvironmentConfig } from './environment';

export type FeatureFlag = 
  | 'predictiveSupply'
  | 'marketing'
  | 'deliveryIntelligence'
  | 'customerInsights'
  | 'newCheckoutFlow'
  | 'enableAnalytics';

// 3. Registry Defaults
const REGISTRY_DEFAULTS: Record<FeatureFlag, boolean> = {
  predictiveSupply: true,
  marketing: true,
  deliveryIntelligence: true,
  customerInsights: true,
  newCheckoutFlow: false,
  enableAnalytics: true,
};

export const FeatureFlags = {
  /**
   * Evaluates a feature flag in the following priority:
   * 1. Local Overrides (localStorage)
   * 2. Environment Variables (VITE_FF_*)
   * 3. Registry Defaults
   * 
   * Designed to be fully compatible with Firebase Remote Config later.
   * A Remote Config service would just update the defaults or overrides cache.
   */
  isEnabled(flag: FeatureFlag): boolean {
    // 1. Local Overrides (Dev only for safety)
    if (EnvironmentConfig.isDevelopment()) {
      try {
        const localOverride = localStorage.getItem(`FF_${flag}`);
        if (localOverride !== null) {
          return localOverride === 'true';
        }
      } catch (e) {
        // Ignore localStorage errors
      }
    }

    // 2. Environment Variables
    // Expected format: VITE_FF_PREDICTIVE_SUPPLY
    // Since env vars are statically replaced by Vite, we have to look them up dynamically or use a map.
    // To keep it simple and type-safe, we'll check import.meta.env for specific flags if we need to.
    const envVarKey = `VITE_FF_${flag.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
    const envValue = import.meta.env[envVarKey];
    if (envValue !== undefined) {
      return envValue === 'true';
    }

    // 3. Registry Defaults
    return REGISTRY_DEFAULTS[flag];
  },

  /**
   * Sets a local override for testing purposes.
   */
  setLocalOverride(flag: FeatureFlag, value: boolean): void {
    if (EnvironmentConfig.isDevelopment() || EnvironmentConfig.isPreview()) {
      try {
        localStorage.setItem(`FF_${flag}`, String(value));
      } catch (e) {}
    } else {
      console.warn('Feature flag overrides are not permitted in production.');
    }
  },

  /**
   * Clears a local override.
   */
  clearLocalOverride(flag: FeatureFlag): void {
    try {
      localStorage.removeItem(`FF_${flag}`);
    } catch (e) {}
  }
};
