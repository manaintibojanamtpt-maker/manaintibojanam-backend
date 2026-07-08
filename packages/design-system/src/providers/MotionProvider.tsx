import React, { createContext, useContext, useMemo } from 'react';
import { useReducedMotion } from '../hooks';
import { motionPresets } from '../tokens/animation';

interface MotionContextValue {
  reducedMotion: boolean;
  presets: typeof motionPresets;
}

const MotionContext = createContext<MotionContextValue | null>(null);

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
  const value = useMemo(
    () => ({ reducedMotion, presets: motionPresets }),
    [reducedMotion],
  );
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export function useBdsMotion(): MotionContextValue {
  const ctx = useContext(MotionContext);
  if (!ctx) throw new Error('useBdsMotion must be used within MotionProvider');
  return ctx;
}
