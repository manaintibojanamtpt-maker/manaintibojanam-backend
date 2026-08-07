import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildOrderTrustCopyText,
  formatTrustPanelDeliverySchedule,
} from '../src/features/checkout/domain/checkoutDeliveryDisplay.ts';

describe('formatTrustPanelDeliverySchedule', () => {
  it('ASAP → Deliver now', () => {
    assert.equal(
      formatTrustPanelDeliverySchedule({
        deliveryTimeSlot: 'Standard Delivery (ASAP)',
        voiceScheduleNotice: null,
      }),
      'Deliver now',
    );
  });

  it('Scheduled → Scheduled for {label}', () => {
    assert.equal(
      formatTrustPanelDeliverySchedule({
        deliveryTimeSlot: 'Today, 8:00 PM - 8:30 PM',
        voiceScheduleNotice: { kind: 'applied' },
      }),
      'Scheduled for 8:00 PM - 8:30 PM',
    );
  });

  it('Clarify → contact-support copy', () => {
    assert.equal(
      formatTrustPanelDeliverySchedule({
        deliveryTimeSlot: 'Standard Delivery (ASAP)',
        voiceScheduleNotice: { kind: 'clarify' },
      }),
      'Schedule unclear — please contact support',
    );
  });

  it('Error → contact-support copy', () => {
    assert.equal(
      formatTrustPanelDeliverySchedule({
        deliveryTimeSlot: 'Standard Delivery (ASAP)',
        voiceScheduleNotice: { kind: 'error' },
      }),
      'Schedule unavailable — please contact support',
    );
  });

  it('Notice cleared → slot wins', () => {
    assert.equal(
      formatTrustPanelDeliverySchedule({
        deliveryTimeSlot: 'Today, 8:00 PM - 8:30 PM',
        voiceScheduleNotice: null,
      }),
      'Scheduled for 8:00 PM - 8:30 PM',
    );
  });
});

describe('buildOrderTrustCopyText with trust schedule line', () => {
  it('includes Deliver now in copy/share text', () => {
    const text = buildOrderTrustCopyText({
      orderNumber: '463577',
      orderId: 'ob_ord_mock_001',
      deliveryAddress: 'Flat 12, Koregaon Park, Pune',
      estimatedDelivery: formatTrustPanelDeliverySchedule({
        deliveryTimeSlot: 'ASAP',
      }),
    });
    assert.match(text, /Estimated: Deliver now/);
  });

  it('includes Scheduled for line in copy/share text', () => {
    const text = buildOrderTrustCopyText({
      orderNumber: '463577',
      orderId: 'ob_ord_mock_001',
      deliveryAddress: 'Flat 12, Koregaon Park, Pune',
      estimatedDelivery: formatTrustPanelDeliverySchedule({
        deliveryTimeSlot: 'Today, 8:00 PM - 8:30 PM',
      }),
    });
    assert.match(text, /Estimated: Scheduled for 8:00 PM - 8:30 PM/);
  });

  it('includes contact-support clarify copy when present', () => {
    const delivery = formatTrustPanelDeliverySchedule({
      deliveryTimeSlot: 'ASAP',
      voiceScheduleNotice: { kind: 'clarify' },
    });
    const text = buildOrderTrustCopyText({
      orderNumber: '463577',
      orderId: 'ob_ord_mock_001',
      deliveryAddress: 'Flat 12, Koregaon Park, Pune',
      estimatedDelivery: delivery,
    });
    assert.match(text, /Estimated: Schedule unclear — please contact support/);
  });
});
