import type { ReactNode } from 'react';
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

function TrackCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#120d0c] p-3.5 shadow-[0_10px_28px_rgba(0,0,0,0.32)]">
      {children}
    </div>
  );
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
    <TransactionalPageShell title="Track order" subtitle="" className="!gap-3 !pb-[calc(5.5rem+var(--ob-safe-bottom))]">
      <header className="px-0.5">
        <h1 className="text-xl font-extrabold tracking-tight text-[#fff8f0]">Track order</h1>
        <p className="mt-0.5 text-xs text-[#c4b5a5]">Live status for this order</p>
      </header>

      <TrackCard>
        <TrackingHeroView hero={hero} />
      </TrackCard>

      {delivery ? (
        <TrackCard>
          <TrackingDeliveryPanelView delivery={delivery} onOpenTracking={onOpenDeliveryTracking} />
        </TrackCard>
      ) : null}

      <TrackCard>
        <div aria-label={journeyTitle}>
          <p className="mb-3 text-sm font-bold text-[#fff8f0]">{journeyTitle}</p>
          <CourierTrackingTimelineView steps={timelineSteps} cancelled={timelineCancelled} />
        </div>
      </TrackCard>

      {feedbackSlot ? <TrackCard>{feedbackSlot}</TrackCard> : null}

      {invoice ? (
        <TrackingInvoiceSheetView
          invoice={invoice}
          open={invoiceOpen}
          onClose={onCloseInvoice}
          onPrint={onPrintInvoice}
        />
      ) : null}

      <div className="ob-fixed-cta-bar !z-30">
        <div className="mx-auto flex max-w-lg flex-col gap-2">
          {showInvoiceButton ? (
            <SoftButton type="button" tone="secondary" fullWidth onClick={onOpenInvoice}>
              View digital invoice
            </SoftButton>
          ) : null}
          {showReorder && onReorder ? (
            <SoftButton type="button" fullWidth disabled={reorderBusy} onClick={onReorder}>
              {reorderLabel}
            </SoftButton>
          ) : null}
          <div className="flex gap-2">
            {showAllOrders && onAllOrders ? (
              <SoftButton type="button" tone="secondary" fullWidth onClick={onAllOrders}>
                All orders
              </SoftButton>
            ) : null}
            <SoftButton type="button" tone="ghost" fullWidth onClick={onBrowse}>
              Browse
            </SoftButton>
          </div>
        </div>
      </div>
    </TransactionalPageShell>
  );
}
