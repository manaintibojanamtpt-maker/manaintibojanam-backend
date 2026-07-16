import { ShoppingCart } from 'lucide-react';
import { MarketplaceUxStateView } from '../marketplace/MarketplaceUxStateView';
import { SoftButton } from '../primitives/SoftButton';
import { CartLineView } from './CartLineView';
import { CartRestaurantBannerView } from './CartRestaurantBannerView';
import { CartSummaryView } from './CartSummaryView';
import { TransactionalPageShell } from './TransactionalPageShell';
import type { CartLineViewModel, CartRestaurantBannerViewModel, CartSummaryViewModel } from './types';

export interface CartPageViewProps {
  readonly title: string;
  readonly subtitle: string;
  readonly lines: readonly CartLineViewModel[];
  readonly restaurant?: CartRestaurantBannerViewModel;
  readonly summary: CartSummaryViewModel;
  readonly validationMessages?: readonly string[];
  readonly errorMessage?: string;
  readonly checkoutLabel: string;
  readonly checkoutBusy: boolean;
  readonly onCheckout: () => void;
  readonly onBrowse: () => void;
  readonly onClear: () => void;
  readonly onMenu?: () => void;
  readonly onQuantityChange: (lineId: string, quantity: number) => void;
}

export function CartPageView({
  title,
  subtitle,
  lines,
  restaurant,
  summary,
  validationMessages = [],
  errorMessage,
  checkoutLabel,
  checkoutBusy,
  onCheckout,
  onBrowse,
  onClear,
  onMenu,
  onQuantityChange,
}: CartPageViewProps) {
  return (
    <div className="relative">
      <TransactionalPageShell title={title} subtitle={subtitle} className="!pb-[var(--ob-focus-bottom)]" embedded>
        {restaurant && onMenu ? (
          <CartRestaurantBannerView restaurant={restaurant} onMenu={onMenu} />
        ) : null}

        <ul className="grid list-none gap-3 p-0">
          {lines.map((line) => (
            <CartLineView key={line.lineId} line={line} onQuantityChange={onQuantityChange} />
          ))}
        </ul>

        <CartSummaryView summary={summary} />

        {validationMessages.length > 0 ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3" role="alert">
            {validationMessages.map((message) => (
              <p key={message} className="text-sm text-red-300">
                {message}
              </p>
            ))}
          </div>
        ) : null}

        {errorMessage ? (
          <p role="alert" className="text-sm text-red-300">
            {errorMessage}
          </p>
        ) : null}
      </TransactionalPageShell>

      <div className="ob-fixed-cta-bar">
        <div className="mx-auto flex max-w-lg flex-col gap-2">
          <SoftButton type="button" fullWidth disabled={checkoutBusy} onClick={onCheckout}>
            {checkoutLabel}
          </SoftButton>
          <div className="flex gap-2">
            <SoftButton type="button" tone="secondary" className="flex-1" onClick={onBrowse}>
              Continue browsing
            </SoftButton>
            <SoftButton type="button" tone="ghost" size="compact" onClick={onClear}>
              Clear
            </SoftButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface CartEmptyViewProps {
  readonly onBrowse: () => void;
}

export function CartEmptyView({ onBrowse }: CartEmptyViewProps) {
  return (
    <TransactionalPageShell title="Your cart" subtitle="">
      <MarketplaceUxStateView
        title="Your cart is empty"
        description="Add dishes from a restaurant menu to start an order."
        icon={<ShoppingCart className="h-7 w-7 text-[#FF7A00]" aria-hidden />}
        primaryLabel="Continue browsing"
        onPrimary={onBrowse}
      />
    </TransactionalPageShell>
  );
}
