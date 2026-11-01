type HapticFeedbackType = 'selection' | 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/**
 * Safely triggers haptic feedback on supported devices.
 * Supports Capacitor Haptics on native iOS/Android shells and falls back to
 * navigator.vibrate on modern mobile web browsers.
 */
export const triggerHaptic = (type: HapticFeedbackType = 'light') => {
  if (typeof window === 'undefined') return;

  // 1. Try Capacitor native Haptics if available (iOS / Android app shell)
  try {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; Plugins?: { Haptics?: { impact?: (opts: { style: string }) => Promise<void>; notification?: (opts: { type: string }) => Promise<void>; selectionStart?: () => Promise<void> } } } }).Capacitor;
    if (cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) {
      const haptics = cap.Plugins?.Haptics;
      if (haptics) {
        if (type === 'selection') {
          haptics.selectionStart?.();
          return;
        }
        if (type === 'success' || type === 'warning' || type === 'error') {
          haptics.notification?.({ type: type.toUpperCase() });
          return;
        }
        const styleMap: Record<string, string> = {
          light: 'LIGHT',
          medium: 'MEDIUM',
          heavy: 'HEAVY',
        };
        haptics.impact?.({ style: styleMap[type] || 'LIGHT' });
        return;
      }
    }
  } catch {
    // Ignore Capacitor lookup errors and fallback to web vibration
  }

  // 2. Web vibration fallback (Android Chrome, Firefox, Progressive Web Apps)
  if (!window.navigator || typeof window.navigator.vibrate !== 'function') {
    return;
  }

  try {
    switch (type) {
      case 'selection':
        window.navigator.vibrate(6);
        break;
      case 'light':
        window.navigator.vibrate(10);
        break;
      case 'medium':
        window.navigator.vibrate(22);
        break;
      case 'heavy':
        window.navigator.vibrate(45);
        break;
      case 'success':
        window.navigator.vibrate([12, 30, 24]);
        break;
      case 'warning':
        window.navigator.vibrate([24, 40, 24]);
        break;
      case 'error':
        window.navigator.vibrate([15, 45, 15, 45, 15]);
        break;
      default:
        window.navigator.vibrate(10);
    }
  } catch {
    // Silent fail if vibration permissions or focus prevents it
  }
};
