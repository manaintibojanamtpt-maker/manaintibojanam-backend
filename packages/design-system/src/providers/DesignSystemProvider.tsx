import React from 'react';
import { MotionProvider } from './MotionProvider';
import { ThemeProvider, type ThemeMode } from './ThemeProvider';

export interface DesignSystemProviderProps {
  children: React.ReactNode;
  theme?: ThemeMode;
}

export function DesignSystemProvider({ children, theme = 'food' }: DesignSystemProviderProps) {
  return (
    <ThemeProvider defaultMode={theme}>
      <MotionProvider>
        <div className="bds-root">{children}</div>
      </MotionProvider>
    </ThemeProvider>
  );
}

export { ThemeProvider, useBdsTheme } from './ThemeProvider';
export type { ThemeMode } from '../tokens/colors';
export { MotionProvider, useBdsMotion } from './MotionProvider';
