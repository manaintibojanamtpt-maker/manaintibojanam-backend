import { cn } from '../../utils/cn';

export interface CartBarProps {
  itemCount: number;
  total: string;
  label?: string;
  onCheckout?: () => void;
  className?: string;
}

export function CartBar({ itemCount, total, label = 'View Cart', onCheckout, className }: CartBarProps) {
  return (
    <button type="button" className={cn('bds-cart-bar', className)} onClick={onCheckout}>
      <span>{itemCount} item{itemCount === 1 ? '' : 's'}</span>
      <span>{label} · {total}</span>
    </button>
  );
}
