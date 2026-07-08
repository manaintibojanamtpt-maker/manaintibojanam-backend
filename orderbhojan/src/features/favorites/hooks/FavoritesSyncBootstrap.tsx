import { useFavoritesSync } from './useFavoritesSync';

/** Loads server favorites into local store when the customer is signed in. */
export function FavoritesSyncBootstrap() {
  useFavoritesSync();
  return null;
}
