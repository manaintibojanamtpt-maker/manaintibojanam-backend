import { useNavigate } from 'react-router-dom';
import {
  FavoritesGuestView,
  FavoritesGrid,
  FavoritesGridItem,
  FavoritesLoadingView,
  FavoritesPageView,
} from '@bhojan/storefront-design-system/favorites';
import { MarketplaceUxStateView } from '@bhojan/storefront-design-system/marketplace/MarketplaceUxStateView';
import { TransactionalPageShell } from '@bhojan/storefront-design-system/cart/TransactionalPageShell';
import { Heart } from 'lucide-react';
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

  if (favoritesQuery.isError) {
    return (
      <TransactionalPageShell title="Favorites" subtitle="" embedded>
        <MarketplaceUxStateView
          title="Could not load favorites"
          description="Check your connection and try again."
          icon={<Heart className="h-7 w-7 text-[#FF7A00]" aria-hidden />}
          primaryLabel="Retry"
          onPrimary={() => void favoritesQuery.refetch()}
          secondaryLabel="Explore restaurants"
          onSecondary={() => navigate('/')}
        />
      </TransactionalPageShell>
    );
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
