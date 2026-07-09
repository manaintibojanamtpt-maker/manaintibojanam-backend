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
import { useReorderFromTracking } from '../hooks/useReorderFromTracking';
import { OrderTimeline } from './OrderTimeline';
import { DeliveryTrackingPanel } from './DeliveryTrackingPanel';
import { OrderInvoiceSheet } from './OrderInvoiceSheet';
import { OrderFeedbackPanel } from './OrderFeedbackPanel';
import { trackingStepLabel, normalizeTrackingStatus } from '../utils/trackingSteps';

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
  const { reorder, busy: reorderBusy } = useReorderFromTracking();
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const etaLabel = useMemo(() => {
    const eta = trackingQuery.data?.etaMinutes;
    if (!eta) return null;
    return `${eta.min}–${eta.max} min`;
  }, [trackingQuery.data?.etaMinutes]);

  if (!orderId) {
    return (
      <MotionPage className="ob-tracking-px2 ob-tracking-v3">
        <PremiumEmpty title="Missing order" actionLabel="View orders" onAction={() => navigate('/orders')} />
      </MotionPage>
    );
  }

  if (needsGuestPhone && !canFetch) {
    return (
      <MotionPage className="ob-tracking-px2 ob-tracking-v3">
        <header className="ob-txn-page__header">
          <Text variant="heading" as="h1" className="ob-txn-page__title">
            Track order
          </Text>
          <Text variant="body" className="ob-txn-page__subtitle">
            Enter the mobile number used for this order
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
      <MotionPage className="ob-tracking-px2 ob-tracking-v3">
        <Skeleton height="8rem" />
        <Skeleton height="12rem" />
      </MotionPage>
    );
  }

  if (trackingQuery.isError || !trackingQuery.data) {
    return (
      <MotionPage className="ob-tracking-px2 ob-tracking-v3">
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
  const tracking = trackingQuery.data;
  const trackingPhase = normalizeTrackingStatus(tracking.status);
  const isTerminalTracking = trackingPhase === 'DELIVERED' || trackingPhase === 'CANCELLED';
  const showDeliveryPanel =
    tracking.status === 'OUT_FOR_DELIVERY' && Boolean(tracking.delivery);

  return (
    <MotionPage className="ob-tracking-px2 ob-tracking-v3">
      <section
        className="ob-tracking-px2__hero ob-stove-glow-frame ob-tracking-v3__hero"
        aria-label="Order status"
      >
        <div className="ob-tracking-v3__hero-inner">
          <Text variant="heading" as="p" className="ob-tracking-px2__hero-status">
            {trackingStepLabel(tracking.status)}
          </Text>
          {tracking.restaurant ? (
            <Text variant="subtitle" className="ob-tracking-px2__hero-kitchen">
              {tracking.restaurant.displayName}
            </Text>
          ) : null}
          <Text variant="body" className="ob-tracking-px2__hero-order">
            Order #{tracking.orderNumber}
          </Text>
          {etaLabel && !isTerminalTracking ? (
            <Text variant="subtitle" className="ob-tracking-px2__hero-eta">
              ETA {etaLabel}
            </Text>
          ) : null}
          {!isTerminalTracking ? (
            <div
              className={`ob-tracking-px2__live${isRefreshing ? ' ob-tracking-px2__live--active' : ''}`}
              aria-live="polite"
            >
              <span className="ob-tracking-px2__live-dot" aria-hidden />
              {isRefreshing ? 'Updating live…' : 'Live updates every 5s'}
            </div>
          ) : null}
        </div>
      </section>

      {showDeliveryPanel && tracking.delivery ? (
        <DeliveryTrackingPanel delivery={tracking.delivery} />
      ) : null}

      <section className="ob-tracking-v3__journey" aria-label="Meal journey">
        <Text variant="titleSm" as="h2" className="ob-tracking-v3__journey-title">
          Your meal journey
        </Text>
        <OrderTimeline tracking={tracking} />
      </section>

      {tracking.status === 'DELIVERED' && tracking.invoice ? (
        <div className="ob-tracking-px2__post-actions">
          <Button variant="secondary" onClick={() => setInvoiceOpen(true)}>
            View digital invoice
          </Button>
        </div>
      ) : null}

      {tracking.feedback ? (
        <OrderFeedbackPanel
          orderId={tracking.orderId}
          feedback={tracking.feedback}
          onSubmitted={() => void trackingQuery.refetch()}
        />
      ) : null}

      {tracking.reorder ? (
        <div className="ob-tracking-px2__post-actions">
          <Button
            variant="primary"
            className="ob-tracking-v3__reorder-btn"
            disabled={reorderBusy}
            onClick={() => void reorder(tracking.reorder!)}
          >
            {reorderBusy ? 'Adding to cart…' : 'Reorder same items'}
          </Button>
        </div>
      ) : null}

      <OrderInvoiceSheet
        invoice={tracking.invoice!}
        open={invoiceOpen && Boolean(tracking.invoice)}
        onClose={() => setInvoiceOpen(false)}
      />

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
