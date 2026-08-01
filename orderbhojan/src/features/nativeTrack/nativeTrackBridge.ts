/**
 * Capacitor bridge for native Order Tracking (Android/iOS).
 * When flags/cohort deny or plugin missing → hybrid path unchanged.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { getAppConfig } from '@/config';
import { isFeatureEnabled, loadFeatureFlags } from '@/featureFlags/flags';
import { isNativePlatform } from '@/lib/nativePlatform';
import { trackEvent } from '@/telemetry/analytics';
import {
  getNativeTrackRolloutDecision,
  isNativeTrackEnabledForClient,
  parseTrackOrderIdFromPath,
} from './nativeTrackRollout';

export type NativeTrackOpenResult = {
  readonly opened: boolean;
  readonly reason: string;
};

type NativeTrackPlugin = {
  configure(options: {
    nativeHost: boolean;
    nativeTrack: boolean;
    percent: number;
    internalEmails: string;
    apiBaseUrl: string;
    apiVersion: string;
  }): Promise<void>;
  openTracking(options: {
    orderId: string;
  }): Promise<NativeTrackOpenResult>;
};

const NativeTrack = registerPlugin<NativeTrackPlugin>('OrderBhojanNativeTrack');

function pluginAvailable(): boolean {
  // Local plugins register in MainActivity / iOS app target; treat native platform as available
  // and rely on try/catch + native cohort deny for safety.
  return isNativePlatform();
}

function buildConfigurePayload(input?: {
  readonly userEmail?: string | null;
  readonly userId?: string | null;
}): {
  nativeHost: boolean;
  nativeTrack: boolean;
  percent: number;
  internalEmails: string;
  apiBaseUrl: string;
  apiVersion: string;
} {
  const flags = loadFeatureFlags();
  const config = getAppConfig();
  const decision = getNativeTrackRolloutDecision(input);
  return {
    nativeHost: isFeatureEnabled(flags, 'FF_NATIVE_HOST'),
    nativeTrack: isFeatureEnabled(flags, 'FF_NATIVE_TRACK'),
    percent: decision.percent,
    internalEmails: String(import.meta.env?.VITE_OB_NATIVE_TRACK_INTERNAL_EMAILS ?? ''),
    apiBaseUrl: config.marketplaceApiBaseUrl,
    apiVersion: config.marketplaceApiVersion,
  };
}

/** Sync kill switches + API base to native prefs (call on native bootstrap). */
export async function configureNativeTrackHost(input?: {
  readonly userEmail?: string | null;
  readonly userId?: string | null;
}): Promise<void> {
  if (!pluginAvailable()) return;
  try {
    await NativeTrack.configure(buildConfigurePayload(input));
  } catch {
    // Hybrid remains default.
  }
}

/**
 * Attempt native track open. Returns opened=false → keep/use hybrid.
 */
export async function tryOpenNativeTrack(input: {
  readonly orderId: string;
  readonly userEmail?: string | null;
  readonly userId?: string | null;
  readonly source?: 'route' | 'deeplink' | 'push';
}): Promise<NativeTrackOpenResult> {
  const orderId = input.orderId.trim();
  if (!orderId) {
    return { opened: false, reason: 'missing_order_id' };
  }

  const decision = getNativeTrackRolloutDecision({
    userEmail: input.userEmail,
    userId: input.userId,
  });
  const client = isNativePlatform() ? Capacitor.getPlatform() : 'web';

  if (!decision.enabled) {
    // Only emit on native shells (web PWA is always hybrid by definition).
    if (isNativePlatform()) {
      trackEvent({
        name: 'native_track_fallback_hybrid',
        properties: {
          orderId,
          reason: decision.reason,
          source: input.source ?? 'route',
          impl: 'hybrid',
          client,
        },
      });
    }
    return { opened: false, reason: decision.reason };
  }

  if (!pluginAvailable()) {
    trackEvent({
      name: 'native_track_fallback_hybrid',
      properties: {
        orderId,
        reason: 'plugin_unavailable',
        source: input.source ?? 'route',
        impl: 'hybrid',
        client,
      },
    });
    return { opened: false, reason: 'plugin_unavailable' };
  }

  await configureNativeTrackHost({
    userEmail: input.userEmail,
    userId: input.userId,
  });

  try {
    const result = await NativeTrack.openTracking({
      orderId,
    });
    if (result.opened) {
      trackEvent({
        name: 'native_track_open',
        properties: {
          orderId,
          reason: decision.reason,
          source: input.source ?? 'route',
          impl: 'native',
          client,
        },
      });
    } else {
      trackEvent({
        name: 'native_track_fallback_hybrid',
        properties: {
          orderId,
          reason: result.reason || 'native_declined',
          source: input.source ?? 'route',
          impl: 'hybrid',
          client,
        },
      });
    }
    return result;
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'native_open_error';
    trackEvent({
      name: 'native_track_fallback_hybrid',
      properties: {
        orderId,
        reason,
        source: input.source ?? 'route',
        impl: 'hybrid',
        client,
      },
    });
    return { opened: false, reason };
  }
}

/** Deep link / push path → native if allowed, else caller keeps hybrid routing. */
export async function tryOpenNativeTrackFromPath(
  pathOrUrl: string,
  input?: {
    readonly userEmail?: string | null;
    readonly userId?: string | null;
    readonly source?: 'deeplink' | 'push';
  },
): Promise<NativeTrackOpenResult & { readonly orderId: string | null }> {
  const orderId = parseTrackOrderIdFromPath(pathOrUrl);
  if (!orderId) {
    return { opened: false, reason: 'not_track_path', orderId: null };
  }
  const result = await tryOpenNativeTrack({
    orderId,
    userEmail: input?.userEmail,
    userId: input?.userId,
    source: input?.source ?? 'deeplink',
  });
  return { ...result, orderId };
}

export { isNativeTrackEnabledForClient, parseTrackOrderIdFromPath };
