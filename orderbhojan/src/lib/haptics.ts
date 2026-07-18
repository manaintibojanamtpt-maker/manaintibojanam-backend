type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/** Safely triggers haptic feedback on supported mobile browsers (no Capacitor). */
export function triggerHaptic(type: HapticFeedbackType = 'light'): void {
  if (typeof window === 'undefined' || !window.navigator?.vibrate) {
    return;
  }

  try {
    switch (type) {
      case 'light':
        window.navigator.vibrate(10);
        break;
      case 'medium':
        window.navigator.vibrate(20);
        break;
      case 'heavy':
        window.navigator.vibrate(40);
        break;
      case 'success':
        window.navigator.vibrate([10, 30, 20]);
        break;
      case 'warning':
        window.navigator.vibrate([20, 40, 20]);
        break;
      case 'error':
        window.navigator.vibrate([10, 50, 10, 50, 10]);
        break;
      default:
        window.navigator.vibrate(10);
    }
  } catch {
    // Ignore unsupported or blocked vibrate calls.
  }
}
