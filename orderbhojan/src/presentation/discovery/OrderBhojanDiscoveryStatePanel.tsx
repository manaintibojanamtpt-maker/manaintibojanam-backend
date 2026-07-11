import { OrderBhojanDiscoveryUxState } from '@/presentation/states';

interface OrderBhojanDiscoveryStatePanelProps {
  readonly title: string;
  readonly description: string;
  readonly primaryLabel: string;
  readonly onPrimary: () => void;
  readonly secondaryLabel?: string;
  readonly onSecondary?: () => void;
  readonly role?: 'alert' | 'status';
}

/** @deprecated Use OrderBhojanDiscoveryUxState directly. Kept for rollback shim compatibility. */
export function OrderBhojanDiscoveryStatePanel({
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  role = 'status',
}: OrderBhojanDiscoveryStatePanelProps) {
  return (
    <OrderBhojanDiscoveryUxState
      variant="custom"
      title={title}
      description={description}
      primaryLabel={primaryLabel}
      onPrimary={onPrimary}
      secondaryLabel={secondaryLabel}
      onSecondary={onSecondary}
      role={role}
    />
  );
}
