import type { ReactNode } from 'react';
import { SectionHeader } from '../../primitives/SectionHeader';
import { SoftButton } from '../../primitives/SoftButton';
import { TransactionalPageShell } from '../../cart/TransactionalPageShell';
import { CourierTrackingTimelineView } from './CourierTrackingTimelineView';
import { TrackingDeliveryPanelView } from './TrackingDeliveryPanelView';
import { TrackingHeroView } from './TrackingHeroView';
import { TrackingInvoiceSheetView } from './TrackingInvoiceSheetView';
import type {
  TrackingDeliveryViewModel,
  TrackingHeroViewModel,
  TrackingInvoiceViewModel,
  TrackingTimelineStepViewModel,
} from './types';

export interface TrackingActivePageViewProps {
  readonly hero: TrackingHeroViewModel;
  readonly timelineSteps: readonly TrackingTimelineStepViewModel[];
  readonly timelineCancelled?: boolean;
  readonly delivery?: TrackingDeliveryViewModel;
  readonly onOpenDeliveryTracking?: () => void;
  readonly showInvoiceButton: boolean;
  readonly invoiceOpen: boolean;
  readonly invoice?: TrackingInvoiceViewModel;
  readonly onOpenInvoice: () => void;
  readonly onCloseInvoice: () => void;
  readonly onPrintInvoice?: () => void;
  readonly showReorder: boolean;
  readonly reorderLabel: string;
  readonly reorderBusy: boolean;
  readonly onReorder?: () => void;
  readonly showAllOrders: boolean;
  readonly onAllOrders?: () => void;
  readonly onBrowse: () => void;
  readonly journeyTitle?: string;
  readonly feedbackSlot?: ReactNode;
}

export function TrackingActivePageView({
  hero,
  timelineSteps,
  timelineCancelled,
  delivery,
  onOpenDeliveryTracking,
  showInvoiceButton,
  invoiceOpen,
  invoice,
  onOpenInvoice,
  onCloseInvoice,
  onPrintInvoice,
  showReorder,
  reorderLabel,
  reorderBusy,
  onReorder,
  showAllOrders,
  onAllOrders,
  onBrowse,
  journeyTitle = 'Your meal journey',
  feedbackSlot,
}: TrackingActivePageViewProps) {
  return (
    <TransactionalPageShell title="Track order" subtitle="">
      <TrackingHeroView hero={hero} />

      {delivery ? (
        <TrackingDeliveryPanelView delivery={delivery} onOpenTracking={onOpenDeliveryTracking} />
      ) : null}

      <div aria-label={journeyTitle}>
        <SectionHeader title={journeyTitle} align="left" className="!mb-4 !mt-0" />
        <CourierTrackingTimelineView steps={timelineSteps} cancelled={timelineCancelled} />
      </div>

      {showInvoiceButton ? (
        <SoftButton type="button" tone="secondary" onClick={onOpenInvoice}>
          View digital invoice
        </SoftButton>
      ) : null}

      {feedbackSlot}

      {showReorder && onReorder ? (
        <SoftButton type="button" disabled={reorderBusy} onClick={onReorder}>
          {reorderLabel}
        </SoftButton>
      ) : null}

      {invoice ? (
        <TrackingInvoiceSheetView
          invoice={invoice}
          open={invoiceOpen}
          onClose={onCloseInvoice}
          onPrint={onPrintInvoice}
        />
      ) : null}

      <div className="flex flex-wrap gap-3">
        {showAllOrders && onAllOrders ? (
          <SoftButton type="button" tone="secondary" onClick={onAllOrders}>
            All orders
          </SoftButton>
        ) : null}
        <SoftButton type="button" tone="ghost" onClick={onBrowse}>
          Continue browsing
        </SoftButton>
      </div>
    </TransactionalPageShell>
  );
}
