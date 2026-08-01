import { App } from '@capacitor/app';
import { isNativePlatform } from './nativePlatform';

/**
 * Standardized payloads for Android (Capacitor) bridge communication.
 * This ensures backend and frontend agree on the data shapes for native interactions.
 */
export interface BridgeErrorPayload {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface BridgeSuccessPayload<T = any> {
  data: T;
  timestamp: string;
}

export type BridgeResponse<T = any> = 
  | { success: true; payload: BridgeSuccessPayload<T> }
  | { success: false; payload: BridgeErrorPayload };

/**
 * Creates a standardized error payload to send across the native bridge.
 */
export function createBridgeError(code: string, message: string, details?: any): BridgeResponse<null> {
  return {
    success: false,
    payload: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Minimum required Android app version to access the system.
 * If the native app version is below this, they will be forced to update.
 */
export const MIN_ANDROID_VERSION = '1.0.0';

/**
 * Checks if the current app version meets the minimum required version.
 * Returns true if update is required.
 */
export async function isUpdateRequired(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const info = await App.getInfo();
    // Simple semantic versioning check
    const current = info.version.split('.').map(Number);
    const min = MIN_ANDROID_VERSION.split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
      const c = current[i] || 0;
      const m = min[i] || 0;
      if (c > m) return false;
      if (c < m) return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to check app version', err);
    return false;
  }
}
