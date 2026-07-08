import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Button,
  Input,
  MotionPage,
  PremiumEmpty,
  Skeleton,
  Text,
} from '@bhojan/design-system';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useOrderTracking } from '../hooks/useOrderTracking';
import { OrderTimeline } from './OrderTimeline';
import { trackingStepLabel } from '../utils/trackingSteps';

export function TrackingPage() {
  const navigate = useNavigate();
  const { orderId = '' } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const initialPhone = searchParams.get('phone') ?? '';
  const [guestPhone, setGuestPhone] = useState(initialPhone);
  const [submittedPhone, setSubmittedPhone] = useState(initialPhone);

  const needsGuestPhone = !isAuthenticated;
  const canFetch = isAuthenticated || submittedPhone.replace(/\D/g, '').length >= 4;
  const trackingQuery = useOrderTracking(orderId, needsGuestPhone ? submittedPhone : undefined);

  const etaLabel = useMemo(() => {
    const eta = trackingQuery.data?.etaMinutes;
    if (!eta) return null;
    return `${eta.min}–${eta.max} min`;
  }, [trackingQuery.data?.etaMinutes]);

  if (!orderId) {
    return (
      <MotionPage className="ob-tracking-px2">
        <PremiumEmpty title="Missing order" actionLabel="View orders" onAction={() => navigate('/orders')} />
      </MotionPage>
    );
  }

  if (needsGuestPhone && !canFetch) {
    return (
      <MotionPage className="ob-tracking-px2">
        <header className="ob-txn-page__header">
          <Text variant="heading" as="h1" className="ob-txn-page__title">
            Track order
          </Text>
          <Text variant="body" className="ob-txn-page__subtitle">
            Enter the mobile number used for order {orderId}
          </Text>
        </header>
        <div className="ob-tracking-px2__guest-form">
          <Input
            label="Mobile number"
            inputMode="numeric"
            value={guestPhone}
            onChange={(event) => setGuestPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
          />
          <Button
            variant="primary"
            onClick={() => setSubmittedPhone(guestPhone)}
            disabled={guestPhone.replace(/\D/g, '').length < 4}
          >
            View tracking
          </Button>
        </div>
      </MotionPage>
    );
  }

  if (trackingQuery.isLoading) {
    return (
      <MotionPage className="ob-tracking-px2">
        <Skeleton height="8rem" />
        <Skeleton height="12rem" />
      </MotionPage>
    );
  }

  if (trackingQuery.isError || !trackingQuery.data) {
    return (
      <MotionPage className="ob-tracking-px2">
        <PremiumEmpty
          title="Could not load tracking"
          description="Check the order ID and phone number, then try again."
          actionLabel="Retry"
          onAction={() => trackingQuery.refetch()}
        />
      </MotionPage>
    );
  }

  const isRefreshing = trackingQuery.isFetching && !trackingQuery.isLoading;

  return (
    <MotionPage className="ob-tracking-px2">
      <section className="ob-tracking-px2__hero" aria-label="Order status">
        <Text variant="heading" as="p" className="ob-tracking-px2__hero-status">
          {trackingStepLabel(trackingQuery.data.status)}
        </Text>
        <Text variant="body" className="ob-tracking-px2__hero-order">
          Order {trackingQuery.data.orderId}
        </Text>
        {etaLabel ? (
          <Text variant="subtitle" className="ob-tracking-px2__hero-eta">
            ETA {etaLabel}
          </Text>
        ) : null}
        <div
          className={`ob-tracking-px2__live${isRefreshing ? ' ob-tracking-px2__live--active' : ''}`}
          aria-live="polite"
        >
          <span className="ob-tracking-px2__live-dot" aria-hidden />
          {isRefreshing ? 'Updating live status…' : 'Live updates every 5s'}
        </div>
      </section>

      <OrderTimeline tracking={trackingQuery.data} />

      <div className="ob-tracking-px2__actions">
        {isAuthenticated ? (
          <Button variant="secondary" onClick={() => navigate('/orders')}>
            All orders
          </Button>
        ) : null}
        <Button variant="ghost" onClick={() => navigate('/')}>
          Continue browsing
        </Button>
      </div>
    </MotionPage>
  );
}
