import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchBearerToken } from '@/features/auth/application/authService';
import { getMarketplaceApiClient } from '@/marketplace-api';
import { MarketplaceApiError } from '@/marketplace-api/errors';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useFavoritesStore } from '@/features/experience/store/favoritesStore';

export const favoritesQueryKeys = {
  all: ['favorites'] as const,
  list: () => [...favoritesQueryKeys.all, 'list'] as const,
};

export function useFavoritesSync() {
  const { isAuthenticated, status } = useAuth();
  const setIds = useFavoritesStore((s) => s.setIds);

  const favoritesQuery = useQuery({
    queryKey: favoritesQueryKeys.list(),
    enabled: isAuthenticated && status !== 'loading',
    queryFn: async () => {
      const token = await fetchBearerToken();
      if (!token) {
        setIds([]);
        return [];
      }
      try {
        const result = await getMarketplaceApiClient().listFavorites();
        const ids = result.favorites.map((r) => r.restaurantId);
        setIds(ids);
        return result.favorites;
      } catch (error) {
        if (error instanceof MarketplaceApiError && (error.status === 401 || error.code === 'HTTP_401')) {
          setIds([]);
          return [];
        }
        throw error;
      }
    },
    retry: (failureCount, error) => {
      if (error instanceof MarketplaceApiError && (error.status === 401 || error.code === 'HTTP_401')) {
        return false;
      }
      return failureCount < 1;
    },
    staleTime: 30_000,
  });

  return { favoritesQuery };
}

export function useFavoriteToggle() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: async ({ restaurantId, isFavorite }: { restaurantId: string; isFavorite: boolean }) => {
      if (isFavorite) {
        return getMarketplaceApiClient().removeFavorite(restaurantId);
      }
      return getMarketplaceApiClient().addFavorite(restaurantId);
    },
    onSuccess: (result) => {
      const ids = result.favorites.map((r) => r.restaurantId);
      useFavoritesStore.getState().setIds(ids);
      queryClient.setQueryData(favoritesQueryKeys.list(), result.favorites);
    },
  });

  return useCallback(
    (restaurantId: string) => {
      const isFavorite = useFavoritesStore.getState().isFavorite(restaurantId);
      useFavoritesStore.getState().toggle(restaurantId);
      if (isAuthenticated) {
        toggleMutation.mutate({ restaurantId, isFavorite });
      }
    },
    [isAuthenticated, toggleMutation],
  );
}
