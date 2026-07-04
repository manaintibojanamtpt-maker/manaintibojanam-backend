import type { ReactNode } from 'react';
import { useSearchLocationInvalidation } from '../hooks/useSearchBrowse';

export function SearchProvider({ children }: { children: ReactNode }) {
  useSearchLocationInvalidation();
  return children;
}
