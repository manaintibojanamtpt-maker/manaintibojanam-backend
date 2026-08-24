import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getISTDateParts,
  getScheduledForTimestamp,
  ensureScheduledDeliverySlots,
  isAsapSlot,
  ASAP_SLOT,
} from '../src/features/checkout/domain/deliveryTimeSlots';

describe('delivery slot timezone handling and slot behavior', () => {
  describe('getISTDateParts - timezone consistency', () => {
    it('returns same IST components regardless of runtime timezone', () => {
      // Test with a fixed instant: 2026-08-19T10:00:00.000Z
      // In IST (UTC+5:30) this is 2026-08-19T15:30:00
      const fixedInstant = new Date('2026-08-19T10:00:00.000Z');

      const parts = getISTDateParts(fixedInstant);

      assert.equal(parts.year, 2026);
      assert.equal(parts.month, 8);
      assert.equal(parts.day, 19);
      assert.equal(parts.hour, 15);
      assert.equal(parts.minute, 30);
    });

    it('handles midnight rollover correctly', () => {
      // 2026-08-19T18:30:00.000Z = 2026-08-20T00:00:00 IST
      const fixedInstant = new Date('2026-08-19T18:30:00.000Z');

      const parts = getISTDateParts(fixedInstant);

      assert.equal(parts.year, 2026);
      assert.equal(parts.month, 8);
      assert.equal(parts.day, 20);
      assert.equal(parts.hour, 0);
      assert.equal(parts.minute, 0);
    });

    it('handles year rollover correctly', () => {
      // 2025-12-31T18:30:00.000Z = 2026-01-01T00:00:00 IST
      const fixedInstant = new Date('2025-12-31T18:30:00.000Z');

      const parts = getISTDateParts(fixedInstant);

      assert.equal(parts.year, 2026);
      assert.equal(parts.month, 1);
      assert.equal(parts.day, 1);
      assert.equal(parts.hour, 0);
      assert.equal(parts.minute, 0);
    });
  });

  describe('getScheduledForTimestamp - IST to UTC conversion', () => {
    it('converts 19 Aug 2026 09:00 AM IST to correct UTC', () => {
      const slot = 'Today, 9:00 AM - 9:30 AM';
      // Use a fixed instant where IST date is 2026-08-19
      const now = new Date('2026-08-19T03:30:00.000Z'); // 09:00 IST

      const result = getScheduledForTimestamp(slot, now);

      // 09:00 IST = 03:30 UTC
      assert.equal(result, '2026-08-19T03:30:00.000Z');
    });

    it('converts 19 Aug 2026 06:30 PM IST to correct UTC', () => {
      const slot = 'Today, 6:30 PM - 7:00 PM';
      // Use a fixed instant where IST date is 2026-08-19
      const now = new Date('2026-08-19T03:30:00.000Z'); // 09:00 IST

      const result = getScheduledForTimestamp(slot, now);

      // 18:30 IST = 13:00 UTC
      assert.equal(result, '2026-08-19T13:00:00.000Z');
    });

    it('converts Tomorrow slot correctly with date rollover', () => {
      const slot = 'Tomorrow, 9:00 AM - 9:30 AM';
      // Use a fixed instant where IST date is 2026-08-19
      const now = new Date('2026-08-19T03:30:00.000Z'); // 09:00 IST

      const result = getScheduledForTimestamp(slot, now);

      // Tomorrow 09:00 IST = 2026-08-20T03:30:00.000Z
      assert.equal(result, '2026-08-20T03:30:00.000Z');
    });

    it('returns null for ASAP slots', () => {
      const result = getScheduledForTimestamp('Standard Delivery (ASAP)', new Date());
      assert.equal(result, null);
    });

    it('returns null for ASAP string', () => {
      const result = getScheduledForTimestamp('ASAP', new Date());
      assert.equal(result, null);
    });
  });

  describe('ensureScheduledDeliverySlots - no fabrication', () => {
    it('returns authoritative scheduled slots as-is', () => {
      const slots = ['Standard Delivery (ASAP)', 'Today, 7:00 PM - 7:30 PM', 'Tomorrow, 12:00 PM - 12:30 PM'];
      const result = ensureScheduledDeliverySlots(slots);

      assert.deepEqual(result, slots);
    });

    it('returns only ASAP when backend returns only ASAP', () => {
      const slots = ['Standard Delivery (ASAP)'];
      const result = ensureScheduledDeliverySlots(slots);

      assert.deepEqual(result, ['Standard Delivery (ASAP)']);
      // Should NOT fabricate Today/Tomorrow slots
      assert.equal(result.length, 1);
    });

    it('returns empty array when backend returns empty', () => {
      const slots: string[] = [];
      const result = ensureScheduledDeliverySlots(slots);

      assert.deepEqual(result, []);
      assert.equal(result.length, 0);
    });

    it('returns ASAP when backend returns ASAP only', () => {
      const slots = ['ASAP'];
      const result = ensureScheduledDeliverySlots(slots);

      assert.deepEqual(result, ['ASAP']);
    });

    it('does not fabricate scheduled slots for empty backend response', () => {
      // This is the critical test - no fake slots should be created
      const result = ensureScheduledDeliverySlots([]);
      const hasScheduled = result.some((s) => !isAsapSlot(s));
      assert.equal(hasScheduled, false);
    });

    it('does not fabricate scheduled slots for ASAP-only backend response', () => {
      const result = ensureScheduledDeliverySlots(['Standard Delivery (ASAP)']);
      const hasScheduled = result.some((s) => !isAsapSlot(s));
      assert.equal(hasScheduled, false);
    });
  });

  describe('isAsapSlot', () => {
    it('identifies Standard Delivery (ASAP)', () => {
      assert.equal(isAsapSlot('Standard Delivery (ASAP)'), true);
    });

    it('identifies ASAP string', () => {
      assert.equal(isAsapSlot('ASAP'), true);
    });

    it('rejects scheduled slots', () => {
      assert.equal(isAsapSlot('Today, 7:00 PM - 7:30 PM'), false);
      assert.equal(isAsapSlot('Tomorrow, 12:00 PM - 12:30 PM'), false);
    });
  });
});