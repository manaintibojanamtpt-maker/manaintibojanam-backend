import { useSyncExternalStore } from 'react';
import type { PersonalizationBootstrap } from '../domain/personalizationBootstrap.types';

let current: PersonalizationBootstrap | undefined;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function mergeBootstrap(
  base: PersonalizationBootstrap | undefined,
  patch: PersonalizationBootstrap,
): PersonalizationBootstrap {
  return {
    ...(base ?? {}),
    ...patch,
    ...(patch.reorder !== undefined ? { reorder: patch.reorder } : {}),
    ...(patch.favoriteRestaurants !== undefined
      ? { favoriteRestaurants: patch.favoriteRestaurants }
      : {}),
    ...(patch.recentOrders !== undefined ? { recentOrders: patch.recentOrders } : {}),
    ...(patch.activeRestaurantId !== undefined
      ? { activeRestaurantId: patch.activeRestaurantId }
      : {}),
  };
}

/** Merge caller-owned personalization fields for the layout-mounted assistant. */
export function publishPersonalizationBootstrap(patch: PersonalizationBootstrap): void {
  current = mergeBootstrap(current, patch);
  notify();
}

export function clearPersonalizationReorder(): void {
  if (!current?.reorder) return;
  const next = { ...current };
  delete next.reorder;
  current = Object.keys(next).length ? next : undefined;
  notify();
}

export function clearPersonalizationBootstrap(): void {
  if (current === undefined) return;
  current = undefined;
  notify();
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function getSnapshot(): PersonalizationBootstrap | undefined {
  return current;
}

function getServerSnapshot(): PersonalizationBootstrap | undefined {
  return undefined;
}

export function usePublishedPersonalizationBootstrap(): PersonalizationBootstrap | undefined {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
