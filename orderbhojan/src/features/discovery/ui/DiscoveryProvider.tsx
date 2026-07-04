import type { ReactNode } from 'react';
import { useDiscoveryLocationInvalidation } from '../hooks/useDiscoveryHome';

export function DiscoveryProvider({ children }: { children: ReactNode }) {
  useDiscoveryLocationInvalidation();
  return children;
}
