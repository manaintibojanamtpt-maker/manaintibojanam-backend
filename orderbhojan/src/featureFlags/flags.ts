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
  /** Shared AI consumer assistant — OFF by default; not cascaded by FF_OB_FIRESTORE. */
  'FF_OB_AI_ASSISTANT',
  /** AI voice capture (speech→transcript) — OFF by default; requires FF_OB_AI_ASSISTANT for assist. */
  'FF_OB_AI_VOICE',
  /** Optional TTS confirmation after voice assist — OFF by default. */
  'FF_OB_AI_VOICE_TTS',
  /**
   * Prefer native Android STT bridge when available — OFF by default.
   * Falls back to Web Speech / WebView recognition when native bridge is missing.
   */
  'FF_OB_AI_NATIVE_STT',
  /** Post-order / order-status AI assist — OFF by default; requires FF_OB_AI_ASSISTANT. */
  'FF_OB_AI_POST_ORDER',
  /** Personalized reorder / favorites guidance — OFF by default; requires FF_OB_AI_ASSISTANT. */
  'FF_OB_AI_PERSONALIZATION',
  /**
   * Attach deterministic canary cohort headers to AI gateway calls — OFF by default.
   * No UI change; enables segmented canary + observability when server gate is wired.
   */
  'FF_OB_AI_CANARY_HEADERS',
  /**
   * Live voice-core confirm/add executor (Phase 1.3b) — OFF by default.
   * When off, decideVoiceCartTurn + OB apply path remain the sole mutators (instant rollback).
   */
  'FF_OB_AI_VOICE_CORE_CONFIRM_ADD',
  /**
   * Master kill for any native screen host — OFF by default.
   * Not cascaded by FF_OB_FIRESTORE. Hybrid remains default when false.
   */
  'FF_NATIVE_HOST',
  /**
   * Native order tracking screen — OFF by default.
   * Requires FF_NATIVE_HOST + cohort (see nativeTrackRollout).
   */
  'FF_NATIVE_TRACK',
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
  FF_OB_AI_ASSISTANT: false,
  FF_OB_AI_VOICE: false,
  FF_OB_AI_VOICE_TTS: false,
  FF_OB_AI_NATIVE_STT: false,
  FF_OB_AI_POST_ORDER: false,
  FF_OB_AI_PERSONALIZATION: false,
  FF_OB_AI_CANARY_HEADERS: false,
  FF_OB_AI_VOICE_CORE_CONFIRM_ADD: false,
  FF_NATIVE_HOST: false,
  FF_NATIVE_TRACK: false,
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
