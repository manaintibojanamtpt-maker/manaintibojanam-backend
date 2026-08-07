/**
 * Cross-feature bridge: voice set_delivery_schedule → checkout deliveryTimeSlot.
 * Also carries clarify/error notices for ambiguous or unmatched times.
 */

import { create } from 'zustand';
import type { DeliverySchedulePreference } from '../domain/deliveryScheduleFromAssist';

export type ScheduleVoiceNoticeKind = 'applied' | 'clarify' | 'error';

export type ScheduleVoiceNotice = {
  readonly kind: ScheduleVoiceNoticeKind;
  readonly message: string;
  readonly reason?: string;
};

type CheckoutScheduleState = {
  readonly preference: DeliverySchedulePreference | null;
  readonly notice: ScheduleVoiceNotice | null;
  readonly updatedAt: number;
  setFromVoice: (preference: DeliverySchedulePreference) => void;
  setNotice: (notice: ScheduleVoiceNotice | null) => void;
  clear: () => void;
};

export const useCheckoutScheduleStore = create<CheckoutScheduleState>((set) => ({
  preference: null,
  notice: null,
  updatedAt: 0,
  setFromVoice: (preference) =>
    set({
      preference,
      notice: {
        kind: 'applied',
        message: preference.deliveryType === 'asap'
          ? 'Delivery set to Deliver now (ASAP).'
          : `Delivery scheduled for ${preference.slotLabel || preference.deliveryTimeSlot || 'your chosen time'}.`,
      },
      updatedAt: Date.now(),
    }),
  setNotice: (notice) =>
    set({
      notice,
      // Clarify/error should not keep a stale successful preference.
      ...(notice && notice.kind !== 'applied' ? { preference: null } : {}),
      updatedAt: Date.now(),
    }),
  clear: () => set({ preference: null, notice: null, updatedAt: Date.now() }),
}));
