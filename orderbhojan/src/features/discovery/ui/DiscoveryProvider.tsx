import type { ReactNode } from 'react';

/** Discovery warm-start is handled in main.tsx before React mounts. */
export function DiscoveryProvider({ children }: { children: ReactNode }) {
  return children;
}
