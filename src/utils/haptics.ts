type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/**
 * Safely triggers haptic feedback on supported devices.
 * Uses window.navigator.vibrate under the hood.
 */
export const triggerHaptic = (type: HapticFeedbackType = 'light') => {
  if (typeof window === 'undefined' || !window.navigator || !window.navigator.vibrate) {
    return;
  }

  try {
    switch (type) {
      case 'light':
        // A very short, subtle tap
        window.navigator.vibrate(10);
        break;
      case 'medium':
        // A solid tap, good for standard button presses
        window.navigator.vibrate(20);
        break;
      case 'heavy':
        // A strong, prominent tap
        window.navigator.vibrate(40);
        break;
      case 'success':
        // Two quick ascending taps
        window.navigator.vibrate([10, 30, 20]);
        break;
      case 'warning':
        // Two moderate taps
        window.navigator.vibrate([20, 40, 20]);
        break;
      case 'error':
        // Three quick taps
        window.navigator.vibrate([10, 50, 10, 50, 10]);
        break;
      default:
        window.navigator.vibrate(10);
    }
  } catch (error) {
    // Ignore errors (e.g. if browser throws security error)
    console.warn('Haptic feedback failed:', error);
  }
};
