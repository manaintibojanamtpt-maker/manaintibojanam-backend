import { useQuery } from '@tanstack/react-query';
import { fetchHomeCategories } from '../lib/config/homeCategories';

export const homeCategoriesKeys = {
  all: ['homeCategories'] as const,
};

export function useHomeCategories() {
  return useQuery({
    queryKey: homeCategoriesKeys.all,
    queryFn: fetchHomeCategories,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}
