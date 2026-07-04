import { useQuery } from '@tanstack/react-query';
import { FEATURED_RESTAURANTS, TRENDING_FOODS } from '../data/mockCatalog';
import type { MockFoodItem, MockRestaurant } from '../domain/experience.types';

const MOCK_DELAY_MS = 400;

function delay<T>(value: T, ms = MOCK_DELAY_MS): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });
}

export function useFeaturedRestaurants() {
  return useQuery({
    queryKey: ['experience', 'featured-restaurants'],
    queryFn: () => delay([...FEATURED_RESTAURANTS] as MockRestaurant[]),
    staleTime: 60_000,
  });
}

export function useTrendingFoods() {
  return useQuery({
    queryKey: ['experience', 'trending-foods'],
    queryFn: () => delay([...TRENDING_FOODS] as MockFoodItem[]),
    staleTime: 60_000,
  });
}

export function useSkeletonSection(sectionId: string) {
  return useQuery({
    queryKey: ['experience', 'skeleton-section', sectionId],
    queryFn: () => delay(null, 800),
    staleTime: 30_000,
  });
}
