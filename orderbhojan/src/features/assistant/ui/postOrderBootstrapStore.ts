import { useSyncExternalStore } from 'react';
import type { PostOrderContext } from '../domain/postOrderAssistContract';

/**
 * Publishes caller-owned tracking snapshot to the layout-mounted assistant.
 * Tracking page and assistant are siblings under MarketplaceLayout, so React
 * context from the page cannot reach the FAB/sheet.
 */
let current: PostOrderContext | undefined;
const listeners = new Set<() => void>();

export function publishPostOrderBootstrap(value: PostOrderContext | undefined): void {
  current = value;
  listeners.forEach((listener) => listener());
}

export function clearPostOrderBootstrap(): void {
  if (current === undefined) return;
  current = undefined;
  listeners.forEach((listener) => listener());
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function getSnapshot(): PostOrderContext | undefined {
  return current;
}

function getServerSnapshot(): PostOrderContext | undefined {
  return undefined;
}

export function usePublishedPostOrderBootstrap(): PostOrderContext | undefined {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
