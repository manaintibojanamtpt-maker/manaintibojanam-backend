import React, { createContext, useContext, useState, useEffect } from 'react';

// Default configuration for the entire SaaS platform
export const defaultFeatureFlags = {
  onboardingWizardV2: true,         // Temporary true for implementation testing
  paymentProviderAbstraction: true, // Temporary true for implementation testing
  merchantUPI: false,                // Direct UPI payment method
  cod: false,                        // Cash on Delivery
  guestCheckout: false,              // No-login checkout
};

export type FeatureFlags = typeof defaultFeatureFlags;

interface FeatureFlagContextType {
  flags: FeatureFlags;
  setFlag: (key: keyof FeatureFlags, value: boolean) => void;
  isReady: boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextType>({
  flags: defaultFeatureFlags,
  setFlag: () => {},
  isReady: false
});

export const FeatureFlagProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [flags, setFlags] = useState<FeatureFlags>(defaultFeatureFlags);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 1. In a production Enterprise app, this would fetch from Firebase Remote Config.
    // 2. We allow local storage overrides so QA and Product teams can test features
    //    without redeploying the application.
    try {
      const overrides = localStorage.getItem('bhojanos_ff_overrides');
      if (overrides) {
        const parsed = JSON.parse(overrides);
        setFlags(prev => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      console.warn('[FeatureFlags] Failed to parse overrides from localStorage', e);
    } finally {
      setIsReady(true);
    }
  }, []);

  const setFlag = (key: keyof FeatureFlags, value: boolean) => {
    setFlags(prev => {
      const newFlags = { ...prev, [key]: value };
      localStorage.setItem('bhojanos_ff_overrides', JSON.stringify(newFlags));
      return newFlags;
    });
  };

  return (
    <FeatureFlagContext.Provider value={{ flags, setFlag, isReady }}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

export const useFeatureFlags = () => useContext(FeatureFlagContext);
