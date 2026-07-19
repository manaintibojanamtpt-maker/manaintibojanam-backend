import { describe, expect, it } from 'vitest';
import {
  buildOrderStatusNotificationMessage,
  formatOrderPaymentMethodLabel,
  isSelfPickupDelivery,
} from '../orderNotificationCopy.js';

describe('orderNotificationCopy', () => {
  it('detects self pickup partners', () => {
    expect(isSelfPickupDelivery('Self Pickup')).toBe(true);
    expect(isSelfPickupDelivery('Porter')).toBe(false);
  });

  it('uses pickup copy for self pickup out-for-delivery', () => {
    const message = buildOrderStatusNotificationMessage(
      { orderNumber: 100051, deliveryPartner: 'Self Pickup' },
      'OUT_FOR_DELIVERY',
    );
    expect(message).toContain('self pickup');
    expect(message).not.toContain('rider is on the way');
  });

  it('uses rider copy for third-party delivery', () => {
    const message = buildOrderStatusNotificationMessage(
      { orderNumber: 100052, deliveryPartner: 'Porter' },
      'OUT_FOR_DELIVERY',
    );
    expect(message).toContain('rider is on the way');
  });

  it('formats payment methods consistently', () => {
    expect(formatOrderPaymentMethodLabel('cod')).toBe('Cash on Delivery');
    expect(formatOrderPaymentMethodLabel('upi')).toBe('UPI');
    expect(formatOrderPaymentMethodLabel('razorpay')).toBe('Online (Razorpay)');
  });
});
