import { WebPlugin } from '@capacitor/core';
import type {
  NativeSttListenOptions,
  NativeSttPermissionState,
  OrderBhojanNativeSttPlugin,
} from './nativeAndroidSttTypes';

/** Web stub — native STT is Android-only; callers must fall back to Web Speech. */
export class OrderBhojanNativeSttWeb extends WebPlugin implements OrderBhojanNativeSttPlugin {
  async isAvailable(): Promise<{ available: boolean }> {
    return { available: false };
  }

  async getPermissionState(): Promise<{ state: NativeSttPermissionState }> {
    return { state: 'prompt' };
  }

  async requestPermissions(): Promise<{ state: NativeSttPermissionState }> {
    return { state: 'denied' };
  }

  async startListening(_options?: NativeSttListenOptions): Promise<{
    transcript: string;
    confidence?: number;
    isFinal: boolean;
  }> {
    throw this.unavailable('OrderBhojanNativeStt is only available on Android native builds.');
  }

  async stopListening(): Promise<void> {
    /* no-op */
  }

  async cancelListening(): Promise<void> {
    /* no-op */
  }
}
