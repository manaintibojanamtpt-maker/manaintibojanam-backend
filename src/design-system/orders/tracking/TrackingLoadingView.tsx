import { Skeleton } from '../../primitives/Skeleton';
import { TransactionalPageShell } from '../../cart/TransactionalPageShell';

export function TrackingLoadingView() {
  return (
    <TransactionalPageShell title="Track order" subtitle="">
      <Skeleton className="h-32 w-full rounded-[2rem]" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </TransactionalPageShell>
  );
}
