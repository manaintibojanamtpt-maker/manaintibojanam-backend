import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMarketplaceApiClient } from '@/marketplace-api';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useFavoritesStore } from '@/features/experience/store/favoritesStore';

export const favoritesQueryKeys = {
  all: ['favorites'] as const,
  list: () => [...favoritesQueryKeys.all, 'list'] as const,
};

export function useFavoritesSync() {
  const { isAuthenticated } = useAuth();
  const setIds = useFavoritesStore((s) => s.setIds);

  const favoritesQuery = useQuery({
    queryKey: favoritesQueryKeys.list(),
    enabled: isAuthenticated,
    queryFn: async () => {
      const result = await getMarketplaceApiClient().listFavorites();
      const ids = result.favorites.map((r) => r.restaurantId);
      setIds(ids);
      return result.favorites;
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
