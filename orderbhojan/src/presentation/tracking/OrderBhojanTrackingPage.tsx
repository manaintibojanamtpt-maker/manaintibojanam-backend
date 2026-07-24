import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MarketplaceUxStateView } from '@bhojan/storefront-design-system/marketplace/MarketplaceUxStateView';
import { TransactionalPageShell } from '@bhojan/storefront-design-system/cart/TransactionalPageShell';
import {
  TrackingActivePageView,
  TrackingGuestPhoneView,
  TrackingLoadingView,
} from '@bhojan/storefront-design-system/orders/tracking';
import { buildPostOrderContextFromTracking } from '@/features/assistant/domain/mapTrackingToPostOrderContext';
import { buildPersonalizationBootstrapFromTracking } from '@/features/assistant/domain/mapTrackingToPersonalizationBootstrap';
import { PostOrderBootstrapProvider } from '@/features/assistant/ui/PostOrderBootstrapContext';
import {
  clearPersonalizationReorder,
  publishPersonalizationBootstrap,
} from '@/features/assistant/ui/personalizationBootstrapStore';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useOrderTracking } from '@/features/tracking/hooks/useOrderTracking';
import { useReorderFromTracking } from '@/features/tracking/hooks/useReorderFromTracking';
import { normalizeTrackingStatus } from '@/features/tracking/utils/trackingSteps';
import {
  mapTrackingDelivery,
  mapTrackingHero,
  mapTrackingInvoice,
  mapTrackingTimelineSteps,
} from './mapTrackingViews';
import { OrderBhojanOrderFeedbackPanel } from './OrderBhojanOrderFeedbackPanel';

export function OrderBhojanTrackingPage() {
  const navigate = useNavigate();
  const { orderId = '' } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const initialPhone = searchParams.get('phone') ?? '';
  const [guestPhone, setGuestPhone] = useState(initialPhone);
  const [submittedPhone, setSubmittedPhone] = useState(initialPhone);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const needsGuestPhone = !isAuthenticated;
  const canFetch = isAuthenticated || submittedPhone.replace(/\D/g, '').length >= 4;
  const trackingQuery = useOrderTracking(orderId, needsGuestPhone ? submittedPhone : undefined);
  const { reorder, busy: reorderBusy } = useReorderFromTracking();

  const etaLabel = useMemo(() => {
    const eta = trackingQuery.data?.etaMinutes;
    if (!eta) return null;
    return `${eta.min}–${eta.max} min`;
  }, [trackingQuery.data?.etaMinutes]);

  if (!orderId) {
    return (
      <TransactionalPageShell title="Track order" subtitle="" embedded>
        <MarketplaceUxStateView
          title="Missing order"
          primaryLabel="View orders"
          onPrimary={() => navigate('/orders')}
        />
      </TransactionalPageShell>
    );
  }

  if (needsGuestPhone && !canFetch) {
    return (
      <TrackingGuestPhoneView
        phone={guestPhone}
        submitLabel="View tracking"
        submitDisabled={guestPhone.replace(/\D/g, '').length < 4}
        onPhoneChange={setGuestPhone}
        onSubmit={() => setSubmittedPhone(guestPhone)}
      />
    );
  }

  if (trackingQuery.isLoading) {
    return <TrackingLoadingView />;
  }

  if (trackingQuery.isError || !trackingQuery.data) {
    return (
      <TransactionalPageShell title="Track order" subtitle="" embedded>
        <MarketplaceUxStateView
          title="Could not load tracking"
          description="Check the order ID and phone number, then try again."
          primaryLabel="Retry"
          onPrimary={() => void trackingQuery.refetch()}
          role="alert"
        />
      </TransactionalPageShell>
    );
  }

  const isRefreshing = trackingQuery.isFetching && !trackingQuery.isLoading;
  const tracking = trackingQuery.data;
  const trackingPhase = normalizeTrackingStatus(tracking.status);
  const showDeliveryPanel = tracking.status === 'OUT_FOR_DELIVERY' && Boolean(tracking.delivery);
  const timeline = mapTrackingTimelineSteps(tracking);

  // Caller-owned snapshot for Phase 17 assistant — no extra fetch inside assistant module.
  const postOrderBootstrap = useMemo(
    () =>
      buildPostOrderContextFromTracking({
        orderId,
        guestPhone: needsGuestPhone ? submittedPhone : undefined,
        tracking,
      }),
    [needsGuestPhone, orderId, submittedPhone, tracking],
  );

  // Phase 19: publish reorder line items for reviewable cart-plan proposals.
  useEffect(() => {
    const personalization = buildPersonalizationBootstrapFromTracking({
      orderId: tracking.orderId,
      orderNumber: tracking.orderNumber,
      reorder: tracking.reorder,
    });
    if (personalization) {
      publishPersonalizationBootstrap(personalization);
    } else {
      clearPersonalizationReorder();
    }
    return () => {
      clearPersonalizationReorder();
    };
  }, [tracking]);

  return (
    <PostOrderBootstrapProvider value={postOrderBootstrap}>
      <TrackingActivePageView
        hero={mapTrackingHero(tracking, { etaLabel, liveActive: isRefreshing })}
        timelineSteps={timeline.steps}
        timelineCancelled={timeline.cancelled}
        delivery={showDeliveryPanel && tracking.delivery ? mapTrackingDelivery(tracking.delivery) : undefined}
        onOpenDeliveryTracking={
          tracking.delivery?.trackingUrl
            ? () => window.open(tracking.delivery!.trackingUrl, '_blank', 'noopener,noreferrer')
            : undefined
        }
        showInvoiceButton={trackingPhase === 'DELIVERED' && Boolean(tracking.invoice)}
        invoiceOpen={invoiceOpen}
        invoice={tracking.invoice ? mapTrackingInvoice(tracking.invoice) : undefined}
        onOpenInvoice={() => setInvoiceOpen(true)}
        onCloseInvoice={() => setInvoiceOpen(false)}
        onPrintInvoice={() => window.print()}
        feedbackSlot={
          tracking.feedback ? (
            <OrderBhojanOrderFeedbackPanel
              orderId={tracking.orderId}
              feedback={tracking.feedback}
              onSubmitted={() => void trackingQuery.refetch()}
            />
          ) : null
        }
        showReorder={Boolean(tracking.reorder)}
        reorderLabel={reorderBusy ? 'Adding to cart…' : 'Reorder same items'}
        reorderBusy={reorderBusy}
        onReorder={tracking.reorder ? () => void reorder(tracking.reorder!) : undefined}
        showAllOrders={isAuthenticated}
        onAllOrders={() => navigate('/orders')}
        onBrowse={() => navigate('/')}
      />
    </PostOrderBootstrapProvider>
  );
}
