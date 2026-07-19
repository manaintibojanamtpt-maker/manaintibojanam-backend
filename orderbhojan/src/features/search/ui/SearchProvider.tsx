import type { ReactNode } from 'react';
import { useSearchLocationInvalidation } from '../hooks/useSearchBrowse';
import { useSearchMenuCacheBootstrap } from '../hooks/useSearchMenuCacheBootstrap';
import { useSearchMenuCacheFromBrowse } from '../hooks/useSearchMenuCacheFromBrowse';

export function SearchProvider({ children }: { children: ReactNode }) {
  useSearchLocationInvalidation();
  useSearchMenuCacheFromBrowse();
  useSearchMenuCacheBootstrap();
  return children;
}
