import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { isNativePlatform } from '@/lib/nativePlatform';
import { notifyToast } from '@/shared/providers/BdsToastProvider';
import { triggerHaptic } from '@/lib/haptics';

export function useAndroidBackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastBackPressTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isNativePlatform()) return;

    let backButtonListener: PluginListenerHandle | null = null;

    const registerListener = async () => {
      backButtonListener = await App.addListener('backButton', () => {
        // Priority 1: Check if any bottom sheets or modals are open via DOM
        const openModals = document.querySelectorAll('[role="dialog"], .ob-bottom-sheet');
        if (openModals.length > 0) {
          const topModal = openModals[openModals.length - 1];
          const escapeEvent = new KeyboardEvent('keydown', {
            key: 'Escape',
            code: 'Escape',
            keyCode: 27,
            which: 27,
            bubbles: true,
          });
          topModal.dispatchEvent(escapeEvent);
          triggerHaptic('light');
          return;
        }

        // Priority 2: Navigate back if we are on a sub-route or can go back
        if (location.pathname !== '/' && window.history.length > 1) {
          triggerHaptic('light');
          navigate(-1);
          return;
        }

        // Priority 3: Double tap back within 2 seconds to exit on home screen
        if (location.pathname === '/') {
          const now = Date.now();
          if (now - lastBackPressTimeRef.current < 2000) {
            App.exitApp();
          } else {
            lastBackPressTimeRef.current = now;
            triggerHaptic('medium');
            notifyToast('Press back again to exit OrderBhojan', 'default');
          }
        }
      });
    };

    registerListener();

    return () => {
      if (backButtonListener) {
        backButtonListener.remove();
      }
    };
  }, [navigate, location]);
}
