import { isNativePlatform } from '@/lib/nativePlatform';

type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/** Safely triggers tactile haptic feedback on native Android/iOS and mobile web. */
export function triggerHaptic(type: HapticFeedbackType = 'light'): void {
  if (isNativePlatform()) {
    import('@capacitor/haptics').then(({ Haptics, ImpactStyle, NotificationType }) => {
      try {
        switch (type) {
          case 'light':
            void Haptics.impact({ style: ImpactStyle.Light });
            break;
          case 'medium':
            void Haptics.impact({ style: ImpactStyle.Medium });
            break;
          case 'heavy':
            void Haptics.impact({ style: ImpactStyle.Heavy });
            break;
          case 'success':
            void Haptics.notification({ type: NotificationType.Success });
            break;
          case 'warning':
            void Haptics.notification({ type: NotificationType.Warning });
            break;
          case 'error':
            void Haptics.notification({ type: NotificationType.Error });
            break;
          default:
            void Haptics.impact({ style: ImpactStyle.Light });
        }
      } catch {
        // Ignore native haptics errors
      }
    }).catch(() => {});
    return;
  }

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
