import type { ReactNode } from 'react';
import { useFoodLocationInvalidation } from '../hooks/useFoodLocationInvalidation';

export function FoodProvider({ children }: { children: ReactNode }) {
  useFoodLocationInvalidation();
  return children;
}
