import { isNativePlatform } from '@/lib/nativePlatform';
import type { ConsumerAssistChannel } from '../types';

/**
 * Shared web/Android channel resolver for consumer AI contracts.
 * Capacitor Android/iOS → orderbhojan_android; browser PWA → orderbhojan_web.
 */
export function resolveConsumerAssistChannel(
  isNative: () => boolean = isNativePlatform,
): ConsumerAssistChannel {
  return isNative() ? 'orderbhojan_android' : 'orderbhojan_web';
}
