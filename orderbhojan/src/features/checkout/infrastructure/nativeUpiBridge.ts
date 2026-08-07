import { Capacitor, registerPlugin } from '@capacitor/core';
import { isNativePlatform } from '@/lib/nativePlatform';

type NativeUpiPlugin = {
  openPayUrl(options: { url: string }): Promise<{ opened: boolean; reason?: string }>;
  hasUpiApps(): Promise<{ available: boolean; count: number; packages?: string[] }>;
};

const NativeUpi = registerPlugin<NativeUpiPlugin>('OrderBhojanNativeUpi');

export async function nativeOpenUpiPayUrl(url: string): Promise<boolean> {
  if (!isNativePlatform() || Capacitor.getPlatform() !== 'android') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const result = await NativeUpi.openPayUrl({ url: trimmed });
    return result.opened === true;
  } catch {
    return false;
  }
}

export async function nativeHasUpiApps(): Promise<boolean> {
  if (!isNativePlatform() || Capacitor.getPlatform() !== 'android') return false;
  try {
    const result = await NativeUpi.hasUpiApps();
    return result.available === true;
  } catch {
    return false;
  }
}
