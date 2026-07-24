import { useEffect, type ReactNode } from 'react';
import type { PostOrderContext } from '../domain/postOrderAssistContract';
import {
  clearPostOrderBootstrap,
  publishPostOrderBootstrap,
  usePublishedPostOrderBootstrap,
} from './postOrderBootstrapStore';

/**
 * Publish caller-owned post-order snapshot for the layout-mounted assistant.
 * Clears on unmount so stale order context does not leak across routes.
 */
export function PostOrderBootstrapProvider({
  value,
  children,
}: {
  readonly value: PostOrderContext | undefined;
  readonly children: ReactNode;
}) {
  useEffect(() => {
    publishPostOrderBootstrap(value);
    return () => {
      clearPostOrderBootstrap();
    };
  }, [value]);

  return <>{children}</>;
}

/** @deprecated Prefer usePublishedPostOrderBootstrap — kept for naming clarity. */
export function usePostOrderBootstrap(): PostOrderContext | undefined {
  return usePublishedPostOrderBootstrap();
}
