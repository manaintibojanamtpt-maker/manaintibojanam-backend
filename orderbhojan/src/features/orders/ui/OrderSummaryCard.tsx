import { useNavigate } from 'react-router-dom';
import { Badge, Card, Icon, Text } from '@bhojan/design-system';
import type { OrderSummary } from '@/types/marketplace';

function formatOrderDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function statusVariant(status: string): 'status' | 'offer' | 'cloudKitchen' {
  const normalized = status.toUpperCase();
  if (normalized.includes('DELIVER') || normalized.includes('COMPLETE')) return 'offer';
  if (normalized.includes('CANCEL')) return 'cloudKitchen';
  return 'status';
}

export interface OrderSummaryCardProps {
  readonly order: OrderSummary;
}

export function OrderSummaryCard({ order }: OrderSummaryCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      interactive
      className="ob-order-card"
      onClick={() => navigate(`/orders/${order.orderId}/track`)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigate(`/orders/${order.orderId}/track`);
        }
      }}
      aria-label={`Order ${order.orderId} from ${order.displayName}`}
    >
      <div className="ob-order-card__header">
        <div className="ob-order-card__meta">
          <Text variant="subtitle" as="p" className="ob-order-card__name">
            {order.displayName}
          </Text>
          <Text variant="caption" className="ob-order-card__date">
            {formatOrderDate(order.createdAt)}
          </Text>
        </div>
        <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
      </div>
      <div className="ob-order-card__footer">
        <Text variant="subtitle" className="ob-order-card__total">
          ₹{order.grandTotal}
        </Text>
        <span className="ob-order-card__track-hint">
          Track
          <Icon size={14} label="" aria-hidden>
            <path d="m9 18 6-6-6-6" />
          </Icon>
        </span>
      </div>
    </Card>
  );
}
