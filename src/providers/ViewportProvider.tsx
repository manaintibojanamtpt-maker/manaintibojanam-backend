import React, { createContext, useEffect, useState, ReactNode, useCallback } from 'react';

interface ViewportState {
  height: number;
  width: number;
  offsetTop: number;
  isKeyboardOpen: boolean;
}

export const ViewportContext = createContext<ViewportState>({
  height: window.innerHeight,
  width: window.innerWidth,
  offsetTop: 0,
  isKeyboardOpen: false,
});

export const ViewportProvider = ({ children }: { children: ReactNode }) => {
  const [viewport, setViewport] = useState<ViewportState>({
    height: window.innerHeight,
    width: window.innerWidth,
    offsetTop: 0,
    isKeyboardOpen: false,
  });

  const updateViewport = useCallback(() => {
    // Determine the actual height
    let height = window.innerHeight;
    let width = window.innerWidth;
    let offsetTop = 0;
    
    // visualViewport is much more accurate on iOS, especially with keyboards/PWAs
    if (window.visualViewport) {
      height = window.visualViewport.height;
      width = window.visualViewport.width;
      offsetTop = window.visualViewport.offsetTop;
    }

    // A sudden massive drop in height usually indicates a keyboard
    const isKeyboardOpen = height < window.innerHeight * 0.75;

    setViewport({ height, width, offsetTop, isKeyboardOpen });

    // Enforce CSS variable strictly
    document.documentElement.style.setProperty('--app-height', `${height}px`);
    document.documentElement.style.setProperty('--app-width', `${width}px`);
    
    // The browser natively evaluates env(safe-area-inset-*), so we can just inject it into the max() function.
    document.documentElement.style.setProperty('--safe-top', 'max(env(safe-area-inset-top), 14px)');
    document.documentElement.style.setProperty('--safe-bottom', 'max(env(safe-area-inset-bottom), 14px)');

    // Reset standard scroll on iOS bounce
    if (!isKeyboardOpen && window.scrollY > 0) {
      // In a strict PWA we sometimes need to forcefully reset outer window scroll
      // window.scrollTo(0, 0); // Be careful with this, as inner elements handle scroll
    }
  }, []);

  useEffect(() => {
    // Initial setup
    updateViewport();

    // The magical visualViewport listener for iOS PWAs
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewport);
      window.visualViewport.addEventListener('scroll', updateViewport);
    } else {
      window.addEventListener('resize', updateViewport);
    }

    // Advanced iOS Resume Recovery Engine
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // iOS PWA notorious bug: when returning from a payment gateway, 
        // the layout calculates incorrectly. Force 3 recalculations.
        setTimeout(updateViewport, 50);
        setTimeout(updateViewport, 200);
        setTimeout(updateViewport, 500);
        
        // Bruteforce Safari layout flush
        document.documentElement.style.display = 'none';
        document.documentElement.offsetHeight; // trigger reflow
        document.documentElement.style.display = '';
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('orientationchange', () => {
      setTimeout(updateViewport, 100);
    });

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewport);
        window.visualViewport.removeEventListener('scroll', updateViewport);
      } else {
        window.removeEventListener('resize', updateViewport);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updateViewport]);

  return (
    <ViewportContext.Provider value={viewport}>
      {children}
    </ViewportContext.Provider>
  );
};
