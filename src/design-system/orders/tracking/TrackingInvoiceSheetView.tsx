import { Printer, X } from 'lucide-react';
import { GlassCard } from '../../primitives/GlassCard';
import { SoftButton } from '../../primitives/SoftButton';
import type { TrackingInvoiceViewModel } from './types';

const badgeToneClass = {
  paid: 'bg-emerald-500/15 text-emerald-300',
  pending: 'bg-[#FF7A00]/15 text-[#FF7A00]',
  failed: 'bg-red-500/15 text-red-300',
} as const;

export interface TrackingInvoiceSheetViewProps {
  readonly invoice: TrackingInvoiceViewModel;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onPrint?: () => void;
}

export function TrackingInvoiceSheetView({
  invoice,
  open,
  onClose,
  onPrint,
}: TrackingInvoiceSheetViewProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Digital invoice">
      <button type="button" className="absolute inset-0 bg-black/65" aria-label="Close invoice" onClick={onClose} />
      <GlassCard hoverEffect={false} className="relative max-h-[90vh] w-full max-w-2xl overflow-auto !rounded-[2rem] !p-6 print:max-h-none print:shadow-none">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-white">{invoice.kitchenName}</h2>
            <p className="text-sm text-white/60">{invoice.orderNumberLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            {onPrint ? (
              <SoftButton type="button" tone="secondary" size="compact" onClick={onPrint}>
                <span className="inline-flex items-center gap-1.5">
                  <Printer className="h-4 w-4" aria-hidden />
                  Print / Save PDF
                </span>
              </SoftButton>
            ) : null}
            <SoftButton type="button" tone="ghost" size="compact" onClick={onClose}>
              <X className="h-4 w-4" aria-hidden />
              Close
            </SoftButton>
          </div>
        </header>

        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Invoice for</p>
            <p className="font-bold text-white">{invoice.customerName}</p>
            <p className="text-sm text-white/60">{invoice.createdLabel}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${badgeToneClass[invoice.paymentBadgeTone]}`}>
            {invoice.paymentBadgeLabel}
          </span>
        </div>

        <div className="mb-4 space-y-1 text-sm text-white/60">
          {invoice.phoneLabel ? <p>{invoice.phoneLabel}</p> : null}
          {invoice.addressLabel ? <p>{invoice.addressLabel}</p> : null}
          {invoice.paymentMethodLabel ? <p>{invoice.paymentMethodLabel}</p> : null}
        </div>

        <div className="mb-4 overflow-hidden rounded-xl border border-white/10" role="table" aria-label="Order items">
          <div className="grid grid-cols-4 gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white/50" role="row">
            <span role="columnheader">Item</span>
            <span role="columnheader">Qty</span>
            <span role="columnheader">Rate</span>
            <span role="columnheader">Total</span>
          </div>
          {invoice.items.map((item) => (
            <div key={item.id} className="grid grid-cols-4 gap-2 border-b border-white/5 px-3 py-2 text-sm text-white/80 last:border-b-0" role="row">
              <span role="cell">{item.name}</span>
              <span role="cell">{item.quantityLabel}</span>
              <span role="cell">{item.rateLabel}</span>
              <span role="cell">{item.totalLabel}</span>
            </div>
          ))}
        </div>

        <footer className="space-y-2 border-t border-white/10 pt-4">
          {invoice.totals.map((line) => (
            <div
              key={line.label}
              className={`flex justify-between gap-3 ${line.emphasis ? 'text-base font-bold text-white' : 'text-sm text-white/70'}`}
            >
              <span>{line.label}</span>
              <span>{line.amountLabel}</span>
            </div>
          ))}
        </footer>

        <p className="mt-4 text-sm text-white/50">{invoice.footerNote}</p>
      </GlassCard>
    </div>
  );
}
