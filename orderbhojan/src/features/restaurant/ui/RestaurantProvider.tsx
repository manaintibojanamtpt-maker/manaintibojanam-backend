import type { ReactNode } from 'react';
import { useRestaurantLocationInvalidation } from '../hooks/useRestaurantExperience';

export function RestaurantProvider({ children }: { children: ReactNode }) {
  useRestaurantLocationInvalidation();
  return children;
}
