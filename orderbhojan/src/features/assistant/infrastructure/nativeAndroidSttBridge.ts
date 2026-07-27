/**
 * Capacitor-native Android STT bridge.
 * Feature-flagged via FF_OB_AI_NATIVE_STT; falls back to Web Speech when unavailable.
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import { AssistantApiError } from '../types';
import type {
  NativeSttErrorCode,
  NativeSttListenOptions,
  NativeSttPermissionState,
  NativeSttResultEvent,
  OrderBhojanNativeSttPlugin,
} from './nativeAndroidSttTypes';

export type { NativeSttErrorCode, NativeSttListenOptions, NativeSttPermissionState, NativeSttResultEvent };
export type NativeAndroidSttResult = {
  readonly transcript: string;
  readonly confidence?: number;
  readonly source: 'native' | 'web_fallback_null';
};

const OrderBhojanNativeStt = registerPlugin<OrderBhojanNativeSttPlugin>('OrderBhojanNativeStt', {
  web: () => import('./nativeAndroidSttWeb').then((m) => new m.OrderBhojanNativeSttWeb()),
});

function mapNativeErrorCode(code: string | undefined): NativeSttErrorCode {
  switch (code) {
    case 'permission_denied':
    case 'no_speech':
    case 'network_error':
    case 'recognizer_busy':
    case 'unavailable':
    case 'cancelled':
      return code;
    default:
      return 'unavailable';
  }
}

function toAssistantError(err: unknown): AssistantApiError {
  const anyErr = err as {
    code?: string;
    message?: string;
    data?: { code?: string; message?: string };
  };
  const code = mapNativeErrorCode(anyErr?.data?.code || anyErr?.code);
  const message =
    anyErr?.data?.message ||
    anyErr?.message ||
    'Native speech recognition failed. Try again or type your request.';
  switch (code) {
    case 'permission_denied':
      return new AssistantApiError({
        code: 'AI_VOICE_PERMISSION_DENIED',
        message,
        retryable: false,
      });
    case 'no_speech':
      return new AssistantApiError({
        code: 'AI_VOICE_EMPTY',
        message,
        retryable: true,
      });
    case 'cancelled':
      return new AssistantApiError({
        code: 'AI_VOICE_ABORTED',
        message,
        retryable: true,
      });
    default:
      return new AssistantApiError({
        code: 'AI_VOICE_ERROR',
        message,
        retryable: code === 'network_error' || code === 'recognizer_busy',
      });
  }
}

export async function nativeSttIsAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return false;
  }
  try {
    const result = await OrderBhojanNativeStt.isAvailable();
    return result.available === true;
  } catch {
    return false;
  }
}

export function isNativeAndroidSttAvailable(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  } catch {
    return false;
  }
}

export async function nativeSttGetPermissionState(): Promise<NativeSttPermissionState> {
  try {
    const result = await OrderBhojanNativeStt.getPermissionState();
    return result.state;
  } catch {
    return 'prompt';
  }
}

export async function nativeSttRequestPermissions(): Promise<NativeSttPermissionState> {
  try {
    const result = await OrderBhojanNativeStt.requestPermissions();
    return result.state;
  } catch {
    return 'denied';
  }
}

export async function nativeSttStopListening(): Promise<void> {
  try {
    await OrderBhojanNativeStt.stopListening();
  } catch {
    /* ignore */
  }
}

export async function nativeSttCancelListening(): Promise<void> {
  try {
    await OrderBhojanNativeStt.cancelListening();
  } catch {
    /* ignore */
  }
}

/**
 * Capture one utterance via native Android STT when enabled + available.
 * Returns null so callers fall back to Web Speech when native path cannot run.
 * Throws AssistantApiError for permission_denied / hard failures when native path was selected.
 */
export async function captureNativeAndroidStt(input: {
  readonly enabled: boolean;
  readonly lang?: string;
  readonly signal?: AbortSignal;
  readonly prompt?: string;
  readonly onPartial?: (transcript: string) => void;
  /** When true, throw typed errors instead of silent null (for permission UX). */
  readonly throwOnHardError?: boolean;
}): Promise<NativeAndroidSttResult | null> {
  if (!input.enabled) return null;
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return null;

  const available = await nativeSttIsAvailable();
  if (!available) return null;
  if (input.signal?.aborted) return null;

  const onAbort = () => {
    void nativeSttCancelListening();
  };
  input.signal?.addEventListener('abort', onAbort, { once: true });

  let partialHandle: { remove: () => Promise<void> } | undefined;
  try {
    if (input.onPartial) {
      partialHandle = await OrderBhojanNativeStt.addListener('partialResult', (event) => {
        if (event.transcript?.trim()) input.onPartial?.(event.transcript.trim());
      });
    }

    const result = await OrderBhojanNativeStt.startListening({
      language: input.lang ?? 'en-IN',
      prompt: input.prompt ?? 'Say a dish and kitchen…',
      partialResults: true,
      maxResults: 3,
    });
    const transcript = result?.transcript?.trim();
    if (!transcript) {
      if (input.throwOnHardError) {
        throw new AssistantApiError({
          code: 'AI_VOICE_EMPTY',
          message: 'No speech heard. Tap the mic and speak clearly, then pause.',
          retryable: true,
        });
      }
      return null;
    }
    return {
      transcript,
      confidence: result.confidence,
      source: 'native',
    };
  } catch (err) {
    if (input.signal?.aborted) {
      throw new AssistantApiError({
        code: 'AI_VOICE_ABORTED',
        message: 'Voice capture was interrupted.',
        retryable: true,
      });
    }
    const mapped = toAssistantError(err);
    // Permission denied is always a hard UX error (no silent web fallback).
    if (mapped.code === 'AI_VOICE_PERMISSION_DENIED') {
      throw mapped;
    }
    // Abort / empty speech should surface to the voice loop.
    if (mapped.code === 'AI_VOICE_ABORTED' || mapped.code === 'AI_VOICE_EMPTY') {
      throw mapped;
    }
    // Busy/unavailable → null so Web Speech can try (unless caller demands hard fail).
    if (input.throwOnHardError) {
      throw mapped;
    }
    return null;
  } finally {
    input.signal?.removeEventListener('abort', onAbort);
    await partialHandle?.remove().catch(() => undefined);
  }
}

export { OrderBhojanNativeStt };
