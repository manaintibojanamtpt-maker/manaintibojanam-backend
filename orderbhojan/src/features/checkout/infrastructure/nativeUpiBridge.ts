import { Capacitor, registerPlugin } from '@capacitor/core';
import { isNativePlatform } from '@/lib/nativePlatform';
import { logUpiDiag } from '@/lib/upiDiagnostics';

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
    logUpiDiag('bridge-open', {
      opened: result.opened === true,
      reason: result.reason ?? 'none',
    });
    return result.opened === true;
  } catch {
    logUpiDiag('bridge-open', { reason: 'exception', opened: false });
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
