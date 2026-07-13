import type { ReactNode } from 'react';
import { Heart } from 'lucide-react';
import { MarketplaceUxStateView } from '../marketplace/MarketplaceUxStateView';
import { Skeleton } from '../primitives/Skeleton';
import { TransactionalPageShell } from '../cart/TransactionalPageShell';

export function FavoritesGuestView({
  onSignIn,
}: {
  readonly onSignIn: () => void;
}) {
  return (
    <TransactionalPageShell title="" subtitle="" embedded>
      <MarketplaceUxStateView
        title="Sign in to save favorites"
        description="Keep your go-to restaurants one tap away."
        icon={<Heart className="h-7 w-7 text-[#FF7A00]" aria-hidden />}
        primaryLabel="Sign in"
        onPrimary={onSignIn}
      />
    </TransactionalPageShell>
  );
}

export function FavoritesLoadingView() {
  return (
    <TransactionalPageShell title="Favorites" subtitle="" embedded>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </TransactionalPageShell>
  );
}

export function FavoritesPageView({
  title,
  subtitle,
  emptyTitle,
  emptyDescription,
  exploreLabel,
  onExplore,
  gridContent,
}: {
  readonly title: string;
  readonly subtitle?: string;
  readonly emptyTitle: string;
  readonly emptyDescription: string;
  readonly exploreLabel: string;
  readonly onExplore: () => void;
  readonly gridContent: ReactNode | null;
}) {
  return (
    <TransactionalPageShell title={title} subtitle={subtitle} embedded>
      {gridContent ?? (
        <MarketplaceUxStateView
          title={emptyTitle}
          description={emptyDescription}
          icon={<Heart className="h-7 w-7 text-[#FF7A00]" aria-hidden />}
          primaryLabel={exploreLabel}
          onPrimary={onExplore}
        />
      )}
    </TransactionalPageShell>
  );
}

export function FavoritesGrid({ children }: { readonly children: ReactNode }) {
  return <ul className="grid list-none gap-3 p-0">{children}</ul>;
}

export function FavoritesGridItem({ children }: { readonly children: ReactNode }) {
  return <li className="min-w-0">{children}</li>;
}
