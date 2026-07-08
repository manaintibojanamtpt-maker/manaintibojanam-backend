import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  getSemanticColors,
  semanticColorsToCssVars,
  type ThemeMode,
} from '../tokens/colors';

export interface ThemeContextValue {
  mode: ThemeMode;
  resolved: Exclude<ThemeMode, 'system'>;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const STORAGE_KEY = 'bds-theme-mode';

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveSystem(): Exclude<ThemeMode, 'system'> {
  if (typeof window === 'undefined') return 'food';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'food' : 'foodLight';
}

function resolveTheme(mode: ThemeMode): Exclude<ThemeMode, 'system'> {
  return mode === 'system' ? resolveSystem() : mode;
}

export function ThemeProvider({
  children,
  defaultMode = 'food',
}: {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
}) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      if (defaultMode === 'food') {
        return 'food';
      }
      return stored ?? defaultMode;
    } catch {
      return defaultMode;
    }
  });

  const resolved = useMemo(() => resolveTheme(mode), [mode]);

  useEffect(() => {
    const root = document.documentElement;
    const vars = semanticColorsToCssVars(getSemanticColors(resolved));
    Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value));
    root.dataset.bdsTheme = resolved;
    root.classList.toggle('bds-theme-light', resolved === 'light' || resolved === 'foodLight');
    root.classList.toggle('bds-theme-dark', resolved === 'dark' || resolved === 'brand' || resolved === 'food');
  }, [resolved]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }, [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolved,
      setMode,
      toggle() {
        setMode((current) => {
          const r = resolveTheme(current);
          return r === 'light' ? 'dark' : 'light';
        });
      },
    }),
    [mode, resolved],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useBdsTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useBdsTheme must be used within ThemeProvider');
  return ctx;
}

export type { ThemeMode } from '../tokens/colors';
