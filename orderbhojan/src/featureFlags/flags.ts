export const FEATURE_FLAG_KEYS = [
  'FF_OB_DISCOVERY',
  'FF_OB_SEARCH',
  'FF_OB_TRACKING',
  'FF_OB_NOTIFICATIONS',
  'FF_OB_PAYMENTS',
  'FF_OB_PROMOTIONS',
  'FF_LOCATION_ENABLED',
  'FF_LOCATION_GEOCODE_API',
  'FF_LOCATION_MAP_ENABLED',
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

export type FeatureFlagMap = Record<FeatureFlagKey, boolean>;

const DEFAULT_FLAGS: FeatureFlagMap = {
  FF_OB_DISCOVERY: false,
  FF_OB_SEARCH: false,
  FF_OB_TRACKING: false,
  FF_OB_NOTIFICATIONS: false,
  FF_OB_PAYMENTS: false,
  FF_OB_PROMOTIONS: false,
  FF_LOCATION_ENABLED: false,
  FF_LOCATION_GEOCODE_API: false,
  FF_LOCATION_MAP_ENABLED: false,
};

function readEnvFlag(key: FeatureFlagKey): boolean | undefined {
  const env = import.meta.env ?? {};
  const envKey = `VITE_${key}`;
  const raw = (env as Record<string, string | undefined>)[envKey];
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return undefined;
}

export function loadFeatureFlags(): FeatureFlagMap {
  const flags = { ...DEFAULT_FLAGS };
  for (const key of FEATURE_FLAG_KEYS) {
    const envValue = readEnvFlag(key);
    if (envValue !== undefined) {
      flags[key] = envValue;
    }
  }
  return flags;
}

export function isFeatureEnabled(flags: FeatureFlagMap, key: FeatureFlagKey): boolean {
  return flags[key] === true;
}
