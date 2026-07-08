import { Button, GlassSurface, Text } from '@bhojan/design-system';
import type { OrderTrackingResponse } from '@/types/marketplace';

function formatMoney(value: number) {
  return `₹${Math.round(value)}`;
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

  return (
    <div className="ob-tracking-px2__invoice-overlay" role="dialog" aria-modal="true" aria-label="Digital invoice">
      <div className="ob-tracking-px2__invoice-backdrop" onClick={onClose} aria-hidden />
      <GlassSurface className="ob-tracking-px2__invoice-sheet ob-tracking-px2__invoice-print">
        <header className="ob-tracking-px2__invoice-header">
          <div>
            <Text variant="titleSm" as="h2">{invoice.kitchenName}</Text>
            <Text variant="caption">Digital invoice • #{invoice.orderNumber}</Text>
          </div>
          <div className="ob-tracking-px2__invoice-actions">
            <Button variant="secondary" onClick={() => window.print()}>Print / Save PDF</Button>
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </div>
        </header>

        <div className="ob-tracking-px2__invoice-meta">
          <Text variant="caption">Date: {created}</Text>
          {invoice.customerName ? <Text variant="caption">Customer: {invoice.customerName}</Text> : null}
          {invoice.phone ? <Text variant="caption">Phone: {invoice.phone}</Text> : null}
          {invoice.address ? <Text variant="caption">Address: {invoice.address}</Text> : null}
          {invoice.paymentMethod ? (
            <Text variant="caption">Payment: {invoice.paymentMethod.toUpperCase()}</Text>
          ) : null}
        </div>

        <div className="ob-tracking-px2__invoice-lines">
          {invoice.items.map((item) => (
            <div key={`${item.itemId}-${item.name}`} className="ob-tracking-px2__invoice-line">
              <Text variant="bodySm">{item.quantity}× {item.name}</Text>
              <Text variant="bodySm">{formatMoney(item.unitPrice * item.quantity)}</Text>
            </div>
          ))}
        </div>

        <footer className="ob-tracking-px2__invoice-totals">
          {invoice.deliveryFee > 0 ? (
            <div className="ob-tracking-px2__invoice-line">
              <Text variant="caption">Delivery</Text>
              <Text variant="caption">{formatMoney(invoice.deliveryFee)}</Text>
            </div>
          ) : null}
          {invoice.packingFee > 0 ? (
            <div className="ob-tracking-px2__invoice-line">
              <Text variant="caption">Packaging</Text>
              <Text variant="caption">{formatMoney(invoice.packingFee)}</Text>
            </div>
          ) : null}
          {invoice.gstAmount > 0 ? (
            <div className="ob-tracking-px2__invoice-line">
              <Text variant="caption">Taxes</Text>
              <Text variant="caption">{formatMoney(invoice.gstAmount)}</Text>
            </div>
          ) : null}
          <div className="ob-tracking-px2__invoice-line ob-tracking-px2__invoice-line--total">
            <Text variant="bodySm" style={{ fontWeight: 700 }}>Grand total</Text>
            <Text variant="bodySm" style={{ fontWeight: 700 }}>{formatMoney(invoice.grandTotal)}</Text>
          </div>
        </footer>
      </GlassSurface>
    </div>
  );
}
