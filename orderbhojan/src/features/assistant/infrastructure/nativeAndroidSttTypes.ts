import type { PluginListenerHandle } from '@capacitor/core';

export type NativeSttPermissionState = 'granted' | 'denied' | 'prompt';

export type NativeSttErrorCode =
  | 'permission_denied'
  | 'no_speech'
  | 'network_error'
  | 'recognizer_busy'
  | 'unavailable'
  | 'cancelled';

export type NativeSttListenOptions = {
  readonly language?: string;
  readonly prompt?: string;
  readonly partialResults?: boolean;
  readonly maxResults?: number;
};

export type NativeSttResultEvent = {
  readonly transcript: string;
  readonly confidence?: number;
  readonly isFinal: boolean;
};

export type NativeSttErrorEvent = {
  readonly code: NativeSttErrorCode | string;
  readonly message: string;
};

export interface OrderBhojanNativeSttPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  getPermissionState(): Promise<{ state: NativeSttPermissionState }>;
  requestPermissions(): Promise<{ state: NativeSttPermissionState }>;
  startListening(options?: NativeSttListenOptions): Promise<NativeSttResultEvent>;
  stopListening(): Promise<void>;
  cancelListening(): Promise<void>;
  addListener(
    eventName: 'partialResult',
    listenerFunc: (event: NativeSttResultEvent) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'finalResult',
    listenerFunc: (event: NativeSttResultEvent) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'error',
    listenerFunc: (event: NativeSttErrorEvent) => void,
  ): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}
