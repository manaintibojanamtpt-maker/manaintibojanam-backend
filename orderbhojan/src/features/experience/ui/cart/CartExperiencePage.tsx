import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Icon,
  MotionPage,
  PremiumEmpty,
  QuantityStepper,
  Text,
} from '@bhojan/design-system';
import type { CartLine } from '@/features/cart/store/cartStore';
import {
  cartItemCount,
  cartSubtotal,
  formatCartLineTotal,
  useCartStore,
} from '@/features/cart/store/cartStore';
import { useCartValidation } from '@/features/cart/hooks/useCartValidation';

function formatRestaurantLabel(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function CartLineRow({
  line,
  onQuantityChange,
}: {
  readonly line: CartLine;
  readonly onQuantityChange: (lineId: string, quantity: number) => void;
}) {
  const addons = line.addons ?? [];

  return (
    <li className="ob-cart-line">
      <div className="ob-cart-line__media" aria-hidden>
        <Icon size={28} label="">
          <path d="M3 11h18" />
          <path d="M12 3v18" />
          <circle cx="12" cy="12" r="9" />
        </Icon>
      </div>
      <div className="ob-cart-line__body">
        <Text variant="subtitle" as="p" className="ob-cart-line__name">
          {line.name}
        </Text>
        {line.variantLabel ? (
          <Text variant="caption" className="ob-cart-line__variant">
            {line.variantLabel}
          </Text>
        ) : null}
        {addons.length > 0 ? (
          <div className="ob-cart-line__addons">
            {addons.map((addon) => (
              <span key={addon.id} className="ob-cart-line__addon">
                + {addon.label}
                {addon.price > 0 ? ` (₹${addon.price})` : ''}
              </span>
            ))}
          </div>
        ) : null}
        {line.instructions?.trim() ? (
          <Text variant="caption" className="ob-cart-line__instructions">
            Note: {line.instructions.trim()}
          </Text>
        ) : null}
        <Text variant="caption" className="ob-cart-line__price">
          ₹{line.price} each · {formatCartLineTotal(line)}
        </Text>
      </div>
      <div className="ob-cart-line__stepper">
        <QuantityStepper
          value={line.quantity}
          onChange={(next) => onQuantityChange(line.lineId, next)}
          label={`Quantity for ${line.name}`}
        />
      </div>
    </li>
  );
}

export function CartExperiencePage() {
  const navigate = useNavigate();
  const lines = useCartStore((s) => s.lines);
  const restaurantSlug = useCartStore((s) => s.restaurantSlug);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const clear = useCartStore((s) => s.clear);
  const itemCount = cartItemCount(lines);
  const subtotal = cartSubtotal(lines);
  const { validate, isValidating, result, error, reset } = useCartValidation();

  const restaurantLabel = useMemo(
    () => (restaurantSlug ?? lines[0]?.restaurantSlug ? formatRestaurantLabel(restaurantSlug ?? lines[0]!.restaurantSlug) : null),
    [lines, restaurantSlug],
  );

  useEffect(() => {
    if (itemCount === 0) {
      reset();
    }
  }, [itemCount, reset]);

  const handleCheckout = async () => {
    try {
      const validation = await validate();
      if (!validation.valid) {
        return;
      }
      navigate('/checkout');
    } catch {
      // error surfaced via hook
    }
  };

  if (itemCount > 0) {
    const slug = restaurantSlug ?? lines[0]?.restaurantSlug;

    return (
      <MotionPage className="ob-cart-px2">
        <header className="ob-txn-page__header">
          <Text variant="heading" as="h1" className="ob-txn-page__title">
            Your cart
          </Text>
          <Text variant="body" className="ob-txn-page__subtitle">
            {itemCount} item{itemCount === 1 ? '' : 's'} · Subtotal ₹{subtotal}
          </Text>
        </header>

        {restaurantLabel && slug ? (
          <section className="ob-cart-px2__restaurant" aria-label="Restaurant">
            <div className="ob-cart-px2__restaurant-icon" aria-hidden>
              <Icon size={22} label="">
                <path d="M3 11h18" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                <path d="M5 11v8h14v-8" />
              </Icon>
            </div>
            <div className="ob-cart-px2__restaurant-detail">
              <Text variant="subtitle" as="p" className="ob-cart-px2__restaurant-name">
                {restaurantLabel}
              </Text>
              <Text variant="caption" className="ob-cart-px2__restaurant-meta">
                Ordering from this kitchen
              </Text>
            </div>
            <Button variant="ghost" size="compact" onClick={() => navigate(`/restaurant/${slug}/menu`)}>
              Menu
            </Button>
          </section>
        ) : null}

        <ul className="ob-cart-px2__lines">
          {lines.map((line) => (
            <CartLineRow key={line.lineId} line={line} onQuantityChange={setQuantity} />
          ))}
        </ul>

        <section className="ob-cart-px2__summary" aria-label="Cart summary">
          <div className="ob-cart-px2__summary-row">
            <Text variant="body">Subtotal</Text>
            <Text variant="subtitle">₹{subtotal}</Text>
          </div>
          <div className="ob-cart-px2__summary-row ob-cart-px2__summary-total">
            <Text variant="subtitle">Items</Text>
            <Text variant="body">{itemCount}</Text>
          </div>
        </section>

        {result && !result.valid ? (
          <div className="ob-cart-px2__alert" role="alert">
            {result.issues.map((issue) => (
              <Text key={issue.itemId} variant="body" className="ob-cart-px2__alert-text">
                {issue.message}
              </Text>
            ))}
          </div>
        ) : null}

        {error ? (
          <Text variant="body" role="alert" className="ob-cart-px2__alert-text">
            {error === 'Restaurant not found'
              ? 'This kitchen is not available for checkout. Clear your cart, pick a live restaurant from home, and add items again.'
              : error}
          </Text>
        ) : null}

        <div className="ob-cart-px2__actions">
          <Button variant="primary" fullWidth disabled={isValidating} onClick={() => void handleCheckout()}>
            {isValidating ? 'Checking cart…' : 'Proceed to checkout'}
          </Button>
          <div className="ob-cart-px2__actions-row">
            <Button variant="secondary" onClick={() => navigate('/')}>
              Continue browsing
            </Button>
            <Button variant="ghost" onClick={clear}>
              Clear cart
            </Button>
          </div>
        </div>
      </MotionPage>
    );
  }

  return (
    <MotionPage className="ob-cart-px2">
      <PremiumEmpty
        title="Your cart is empty"
        description="Add dishes from a restaurant menu to start an order."
        actionLabel="Continue browsing"
        onAction={() => navigate('/')}
        icon={
          <Icon size={48} label="Empty cart">
            <circle cx="9" cy="20" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none" />
            <path d="M2 2h2l2.5 13h11l2-8H6" />
          </Icon>
        }
      />
    </MotionPage>
  );
}
