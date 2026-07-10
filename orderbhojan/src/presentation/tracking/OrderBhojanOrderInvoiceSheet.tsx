import type { OrderTrackingResponse } from '@/types/marketplace';
import { TrackingInvoiceSheetView } from '@bhojan/storefront-design-system/orders/tracking';
import { mapTrackingInvoice } from './mapTrackingViews';

export function OrderBhojanOrderInvoiceSheet({
  invoice,
  open,
  onClose,
}: {
  readonly invoice: NonNullable<OrderTrackingResponse['invoice']>;
  readonly open: boolean;
  readonly onClose: () => void;
}) {
  return (
    <TrackingInvoiceSheetView
      invoice={mapTrackingInvoice(invoice)}
      open={open}
      onClose={onClose}
      onPrint={() => window.print()}
    />
  );
}
