/**
 * Order adapter feature flags (M6 PR-11).
 * Additive — does not modify EventSDK or frozen OrderSDK read API.
 */

export type OrderAdapterFeatureFlag = 'FF_ORDER_PROJECTION_ADAPTER_ENABLED';

export const ORDER_ADAPTER_FEATURE_FLAG_DEFAULTS = {
  flags: {
    FF_ORDER_PROJECTION_ADAPTER_ENABLED: false,
  },
} as const;

export const ORDER_ADAPTER_FEATURE_FLAG_ENV_KEYS: Record<OrderAdapterFeatureFlag, string> = {
  FF_ORDER_PROJECTION_ADAPTER_ENABLED: 'VITE_FF_ORDER_PROJECTION_ADAPTER_ENABLED',
};

export type OrderAdapterFeatureFlagReader = (flag: OrderAdapterFeatureFlag) => boolean;

export const readOrderAdapterFlagDefault = (flag: OrderAdapterFeatureFlag): boolean =>
  ORDER_ADAPTER_FEATURE_FLAG_DEFAULTS.flags[flag];
