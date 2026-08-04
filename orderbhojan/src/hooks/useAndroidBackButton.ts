import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import { isNativePlatform } from '@/lib/nativePlatform';

export function useAndroidBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isNativePlatform()) return;

    let backButtonListener: any = null;

    const registerListener = async () => {
      backButtonListener = await App.addListener('backButton', () => {
        // Priority 2: Check if any bottom sheets or modals are open via DOM
        const openModals = document.querySelectorAll('[role="dialog"], .ob-bottom-sheet');
        if (openModals.length > 0) {
          // Dispatch escape to close the top-most modal
          const topModal = openModals[openModals.length - 1];
          const escapeEvent = new KeyboardEvent('keydown', {
            key: 'Escape',
            code: 'Escape',
            keyCode: 27,
            which: 27,
            bubbles: true,
          });
          topModal.dispatchEvent(escapeEvent);
          return;
        }

        // Priority 3: Navigate back via React Router
        if (location.pathname !== '/' && window.history.length > 1) {
          navigate(-1);
          return;
        }

        // Priority 1 / 4: Allow exit if at root
        if (location.pathname === '/') {
          App.exitApp();
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
