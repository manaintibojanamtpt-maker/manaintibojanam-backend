import { useNavigate } from 'react-router-dom';
import {
  FavoritesGuestView,
  FavoritesGrid,
  FavoritesGridItem,
  FavoritesLoadingView,
  FavoritesPageView,
} from '@bhojan/storefront-design-system/favorites';
import { useAuth } from '@/shared/providers/AuthProvider';
import { OrderBhojanKitchenCard } from '@/presentation/discovery/OrderBhojanKitchenCard';
import { useFavoritesSync } from '@/features/favorites/hooks/useFavoritesSync';

export function OrderBhojanFavoritesPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { favoritesQuery } = useFavoritesSync();

  if (!isAuthenticated) {
    return <FavoritesGuestView onSignIn={() => navigate('/auth')} />;
  }

  if (favoritesQuery.isLoading) {
    return <FavoritesLoadingView />;
  }

  const favorites = favoritesQuery.data ?? [];

  return (
    <FavoritesPageView
      title="Favorites"
      subtitle={
        favorites.length > 0
          ? `${favorites.length} saved restaurant${favorites.length === 1 ? '' : 's'}`
          : undefined
      }
      emptyTitle="No favorites yet"
      emptyDescription="Tap the heart on any restaurant to save it here."
      exploreLabel="Explore restaurants"
      onExplore={() => navigate('/')}
      gridContent={
        favorites.length === 0 ? null : (
          <FavoritesGrid>
            {favorites.map((restaurant) => (
              <FavoritesGridItem key={restaurant.restaurantId}>
                <OrderBhojanKitchenCard restaurant={restaurant} width="100%" />
              </FavoritesGridItem>
            ))}
          </FavoritesGrid>
        )
      }
    />
  );
}
