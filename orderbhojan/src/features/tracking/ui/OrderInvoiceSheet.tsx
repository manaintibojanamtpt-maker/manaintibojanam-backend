import { Button, GlassSurface, Text } from '@bhojan/design-system';
import type { OrderTrackingResponse } from '@/types/marketplace';

function formatMoney(value: number) {
  return `₹${Math.round(value)}`;
}

function paymentStatusLabel(invoice: NonNullable<OrderTrackingResponse['invoice']>): {
  label: string;
  tone: 'paid' | 'pending' | 'failed';
} {
  const status = (invoice.paymentStatus ?? '').toLowerCase();
  const method = (invoice.paymentMethod ?? '').toLowerCase();
  if (['paid', 'success', 'verified'].includes(status)) {
    return { label: 'Paid', tone: 'paid' };
  }
  if (['failed', 'expired'].includes(status)) {
    return { label: 'Failed', tone: 'failed' };
  }
  if (method === 'cod') {
    return { label: 'Cash on delivery', tone: 'pending' };
  }
  return { label: 'Pending', tone: 'pending' };
}

export function OrderInvoiceSheet({
  invoice,
  open,
  onClose,
}: {
  readonly invoice: NonNullable<OrderTrackingResponse['invoice']>;
  readonly open: boolean;
  readonly onClose: () => void;
}) {
  if (!open) return null;

  const created = new Date(invoice.createdAt).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const payment = paymentStatusLabel(invoice);
  const gstPercent = invoice.gstPercent ?? 0;

  return (
    <div className="ob-tracking-px2__invoice-overlay" role="dialog" aria-modal="true" aria-label="Digital invoice">
      <div className="ob-tracking-px2__invoice-backdrop" onClick={onClose} aria-hidden />
      <GlassSurface className="ob-tracking-px2__invoice-sheet ob-tracking-px2__invoice-print ob-tracking-v3__invoice">
        <header className="ob-tracking-px2__invoice-header">
          <div>
            <Text variant="titleSm" as="h2">{invoice.kitchenName}</Text>
            <Text variant="caption">Digital invoice • Order #{invoice.orderNumber}</Text>
          </div>
          <div className="ob-tracking-px2__invoice-actions">
            <Button variant="secondary" onClick={() => window.print()}>Print / Save PDF</Button>
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </div>
        </header>

        <div className="ob-tracking-v3__invoice-status-row">
          <div>
            <Text variant="microLabel" className="ob-tracking-v3__invoice-kicker">Invoice for</Text>
            <Text variant="bodySm" style={{ fontWeight: 700 }}>{invoice.customerName ?? 'Customer'}</Text>
            <Text variant="caption">Date: {created}</Text>
          </div>
          <span className={`ob-tracking-v3__invoice-badge ob-tracking-v3__invoice-badge--${payment.tone}`}>
            {payment.label}
          </span>
        </div>

        <div className="ob-tracking-px2__invoice-meta ob-tracking-v3__invoice-meta">
          {invoice.phone ? <Text variant="caption">Phone: {invoice.phone}</Text> : null}
          {invoice.address ? <Text variant="caption">Delivery address: {invoice.address}</Text> : null}
          {invoice.paymentMethod ? (
            <Text variant="caption">
              Payment method: {invoice.paymentMethod.toUpperCase() === 'RAZORPAY' ? 'Online (Razorpay)' : invoice.paymentMethod.toUpperCase()}
            </Text>
          ) : null}
        </div>

        <div className="ob-tracking-v3__invoice-table" role="table" aria-label="Order items">
          <div className="ob-tracking-v3__invoice-table-head" role="row">
            <span role="columnheader">Item</span>
            <span role="columnheader">Qty</span>
            <span role="columnheader">Rate</span>
            <span role="columnheader">Total</span>
          </div>
          {invoice.items.map((item) => (
            <div key={`${item.itemId}-${item.name}`} className="ob-tracking-v3__invoice-table-row" role="row">
              <Text variant="bodySm" role="cell">{item.name}</Text>
              <Text variant="bodySm" role="cell">{item.quantity}</Text>
              <Text variant="bodySm" role="cell">{formatMoney(item.unitPrice)}</Text>
              <Text variant="bodySm" role="cell">{formatMoney(item.unitPrice * item.quantity)}</Text>
            </div>
          ))}
        </div>

        <footer className="ob-tracking-px2__invoice-totals ob-tracking-v3__invoice-totals">
          <div className="ob-tracking-px2__invoice-line">
            <Text variant="caption">Subtotal</Text>
            <Text variant="caption">{formatMoney(invoice.subtotal)}</Text>
          </div>
          {invoice.discountAmount && invoice.discountAmount > 0 ? (
            <div className="ob-tracking-px2__invoice-line">
              <Text variant="caption">Discount</Text>
              <Text variant="caption">−{formatMoney(invoice.discountAmount)}</Text>
            </div>
          ) : null}
          {invoice.gstAmount > 0 ? (
            <div className="ob-tracking-px2__invoice-line">
              <Text variant="caption">{gstPercent > 0 ? `GST (${gstPercent}%)` : 'GST'}</Text>
              <Text variant="caption">{formatMoney(invoice.gstAmount)}</Text>
            </div>
          ) : null}
          {invoice.packingFee > 0 ? (
            <div className="ob-tracking-px2__invoice-line">
              <Text variant="caption">Packaging</Text>
              <Text variant="caption">{formatMoney(invoice.packingFee)}</Text>
            </div>
          ) : null}
          {invoice.deliveryFee > 0 ? (
            <div className="ob-tracking-px2__invoice-line">
              <Text variant="caption">Delivery</Text>
              <Text variant="caption">{formatMoney(invoice.deliveryFee)}</Text>
            </div>
          ) : null}
          <div className="ob-tracking-px2__invoice-line ob-tracking-px2__invoice-line--total">
            <Text variant="bodySm" style={{ fontWeight: 700 }}>
              {payment.tone === 'paid' ? 'Total paid' : 'Amount due'}
            </Text>
            <Text variant="bodySm" style={{ fontWeight: 700 }}>{formatMoney(invoice.grandTotal)}</Text>
          </div>
        </footer>

        <Text variant="caption" className="ob-tracking-v3__invoice-footer">
          Thank you for ordering from {invoice.kitchenName}. This is a computer-generated invoice.
        </Text>
      </GlassSurface>
    </div>
  );
}
