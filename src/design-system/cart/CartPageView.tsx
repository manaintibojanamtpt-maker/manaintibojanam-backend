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
  readonly recommendationsContent?: React.ReactNode;
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
  recommendationsContent,
}: CartPageViewProps) {
  return (
    <div className="relative pb-36">
      <TransactionalPageShell title={title} subtitle={subtitle} className="!gap-3" embedded>
        <header className="px-0.5">
          <h1 className="text-xl font-extrabold tracking-tight text-[#fff8f0]">{title}</h1>
          <p className="mt-0.5 text-xs text-[#c4b5a5]">{subtitle}</p>
        </header>

        {restaurant && onMenu ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#120d0c] p-3 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
            <CartRestaurantBannerView restaurant={restaurant} onMenu={onMenu} />
          </div>
        ) : null}

        <ul className="grid list-none gap-2 rounded-2xl border border-white/[0.08] bg-[#120d0c] p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
          {lines.map((line) => (
            <CartLineView key={line.lineId} line={line} onQuantityChange={onQuantityChange} />
          ))}
        </ul>

        {recommendationsContent}

        <div className="rounded-2xl border border-white/[0.08] bg-[#120d0c] p-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
          <CartSummaryView summary={summary} />
        </div>

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
          <div className="flex items-center justify-between px-0.5 text-sm">
            <span className="font-medium text-white/60">Subtotal</span>
            <span className="font-extrabold text-[#fff8f0]">{summary.subtotalLabel}</span>
          </div>
          <SoftButton type="button" fullWidth disabled={checkoutBusy} onClick={onCheckout}>
            {checkoutLabel}
          </SoftButton>
          <div className="flex gap-2">
            <SoftButton type="button" tone="secondary" className="flex-1" onClick={onBrowse}>
              Browse
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
    <TransactionalPageShell title="Your cart" subtitle="" embedded>
      <MarketplaceUxStateView
        title="Your cart is empty"
        description="Add dishes from a restaurant menu to start an order."
        icon={<ShoppingCart className="h-7 w-7 text-[#e85d04]" aria-hidden />}
        primaryLabel="Continue browsing"
        onPrimary={onBrowse}
      />
    </TransactionalPageShell>
  );
}
