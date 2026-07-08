export const FEATURE_FLAG_KEYS = [
  'FF_OB_DISCOVERY',
  'FF_OB_SEARCH',
  'FF_OB_RESTAURANT',
  'FF_OB_MENU',
  'FF_OB_CONTRACT_V1',
  'FF_OB_FIRESTORE',
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
  FF_OB_RESTAURANT: false,
  FF_OB_MENU: false,
  FF_OB_CONTRACT_V1: false,
  FF_OB_FIRESTORE: false,
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
  // Production builds default to live Firestore/API unless explicitly disabled.
  if (import.meta.env?.PROD && readEnvFlag('FF_OB_FIRESTORE') === undefined) {
    flags.FF_OB_FIRESTORE = true;
  }
  if (flags.FF_OB_FIRESTORE) {
    flags.FF_OB_DISCOVERY = true;
    flags.FF_OB_RESTAURANT = true;
    flags.FF_OB_MENU = true;
    flags.FF_OB_SEARCH = true;
    flags.FF_OB_TRACKING = true;
    flags.FF_OB_NOTIFICATIONS = true;
    flags.FF_OB_PAYMENTS = true;
    flags.FF_LOCATION_ENABLED = true;
    flags.FF_LOCATION_GEOCODE_API = true;
  }
  return flags;
}

export function isFeatureEnabled(flags: FeatureFlagMap, key: FeatureFlagKey): boolean {
  return flags[key] === true;
}
