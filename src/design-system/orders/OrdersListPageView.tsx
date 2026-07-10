import { ShoppingBag } from 'lucide-react';
import { MarketplaceUxStateView } from '../marketplace/MarketplaceUxStateView';
import { Skeleton } from '../primitives/Skeleton';
import { SoftButton } from '../primitives/SoftButton';
import { TransactionalPageShell } from '../cart/TransactionalPageShell';
import { OrderSummaryCardView } from './OrderSummaryCardView';
import type { OrderSummaryCardViewModel } from './types';

export interface OrdersListPageViewProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly orders: readonly OrderSummaryCardViewModel[];
  readonly onSelectOrder: (orderId: string) => void;
  readonly onBrowse: () => void;
  readonly onSignIn?: () => void;
  readonly onRetry?: () => void;
  readonly showRetry?: boolean;
}

export function OrdersListPageView({
  title,
  subtitle,
  orders,
  onSelectOrder,
  onBrowse,
  onSignIn,
  onRetry,
  showRetry = false,
}: OrdersListPageViewProps) {
  return (
    <TransactionalPageShell title={title} subtitle={subtitle}>
      {orders.length === 0 ? (
        <>
          <MarketplaceUxStateView
            title="No orders yet"
            description="When you place your first order, it will appear here with live tracking."
            icon={<ShoppingBag className="h-7 w-7 text-[#FF7A00]" aria-hidden />}
            primaryLabel="Explore restaurants"
            onPrimary={onBrowse}
          />
          {onSignIn ? (
            <div className="flex justify-center">
              <SoftButton type="button" tone="ghost" onClick={onSignIn}>
                Sign in to sync orders
              </SoftButton>
            </div>
          ) : null}
        </>
      ) : (
        <ul className="grid list-none gap-3 p-0">
          {orders.map((order) => (
            <li key={order.orderId}>
              <OrderSummaryCardView order={order} onSelect={() => onSelectOrder(order.orderId)} />
            </li>
          ))}
        </ul>
      )}

      {showRetry && onRetry ? (
        <SoftButton type="button" tone="ghost" onClick={onRetry}>
          Retry loading orders
        </SoftButton>
      ) : null}
    </TransactionalPageShell>
  );
}

export function OrdersListLoadingView() {
  return (
    <TransactionalPageShell title="Orders" subtitle="">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </TransactionalPageShell>
  );
}
