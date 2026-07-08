import { useNavigate } from 'react-router-dom';
import {
  EmptyState,
  MotionPage,
  PremiumEmpty,
  Skeleton,
  Text,
} from '@bhojan/design-system';
import { DiscoveryRestaurantCard } from '@/features/discovery/ui/DiscoveryRestaurantCard';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useFavoritesSync } from '../hooks/useFavoritesSync';

export function FavoritesPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { favoritesQuery } = useFavoritesSync();

  if (!isAuthenticated) {
    return (
      <MotionPage className="ob-favorites-px2">
        <PremiumEmpty
          title="Sign in to save favorites"
          description="Keep your go-to restaurants one tap away."
          actionLabel="Sign in"
          onAction={() => navigate('/auth')}
        />
      </MotionPage>
    );
  }

  if (favoritesQuery.isLoading) {
    return (
      <MotionPage className="ob-favorites-px2">
        <Skeleton height="2rem" />
        <Skeleton height="12rem" />
      </MotionPage>
    );
  }

  const favorites = favoritesQuery.data ?? [];

  return (
    <MotionPage className="ob-favorites-px2">
      <header className="ob-txn-page__header">
        <Text variant="heading" as="h1" className="ob-txn-page__title">
          Favorites
        </Text>
        {favorites.length > 0 ? (
          <Text variant="body" className="ob-txn-page__subtitle">
            {favorites.length} saved restaurant{favorites.length === 1 ? '' : 's'}
          </Text>
        ) : null}
      </header>

      {favorites.length === 0 ? (
        <EmptyState
          title="No favorites yet"
          description="Tap the heart on any restaurant to save it here."
          actionLabel="Explore restaurants"
          onAction={() => navigate('/')}
        />
      ) : (
        <ul className="ob-favorites-px2__grid">
          {favorites.map((restaurant) => (
            <li key={restaurant.restaurantId}>
              <DiscoveryRestaurantCard restaurant={restaurant} width="100%" />
            </li>
          ))}
        </ul>
      )}
    </MotionPage>
  );
}
