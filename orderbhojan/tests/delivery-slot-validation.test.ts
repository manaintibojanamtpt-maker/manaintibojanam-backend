import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('delivery slot validation and explicit status', () => {
  it('useCheckoutFlow has DeliverySlotStatus type with explicit states', () => {
    const checkoutFlow = readFileSync(
      join(root, 'src/features/checkout/hooks/useCheckoutFlow.ts'),
      'utf8',
    );

    assert.match(checkoutFlow, /DeliverySlotStatus = 'loading' \| 'available' \| 'unavailable' \| 'error'/);
  });

  it('useCheckoutFlow exposes deliverySlotStatus in CheckoutFlowState', () => {
    const checkoutFlow = readFileSync(
      join(root, 'src/features/checkout/hooks/useCheckoutFlow.ts'),
      'utf8',
    );

    assert.match(checkoutFlow, /deliverySlotStatus: DeliverySlotStatus;/);
  });

  it('useCheckoutFlow has validateSelectedSlot helper function', () => {
    const checkoutFlow = readFileSync(
      join(root, 'src/features/checkout/hooks/useCheckoutFlow.ts'),
      'utf8',
    );

    assert.match(checkoutFlow, /validateSelectedSlot/);
    assert.match(checkoutFlow, /ASAP is always valid/);
    assert.match(checkoutFlow, /Scheduled slot must exist in current slots/);
    assert.match(checkoutFlow, /Selected slot no longer valid - return ASAP as safe fallback/);
  });

  it('scheduling useEffect sets deliverySlotStatus based on slots', () => {
    const checkoutFlow = readFileSync(
      join(root, 'src/features/checkout/hooks/useCheckoutFlow.ts'),
      'utf8',
    );

    assert.match(checkoutFlow, /setDeliverySlotStatus\('loading'\)/);
    assert.match(checkoutFlow, /setDeliverySlotStatus\('available'\)/);
    assert.match(checkoutFlow, /setDeliverySlotStatus\('unavailable'\)/);
    assert.match(checkoutFlow, /setDeliverySlotStatus\('error'\)/);
  });

  it('OrderBhojanCheckoutPage passes deliverySlotStatus to deliverySlotView', () => {
    const checkoutPage = readFileSync(
      join(root, 'src/presentation/checkout/OrderBhojanCheckoutPage.tsx'),
      'utf8',
    );

    assert.match(checkoutPage, /deliverySlotStatus/);
    assert.match(checkoutPage, /status: deliverySlotStatus/);
  });

  it('reset resets deliverySlotStatus to loading', () => {
    const checkoutFlow = readFileSync(
      join(root, 'src/features/checkout/hooks/useCheckoutFlow.ts'),
      'utf8',
    );

    assert.match(checkoutFlow, /reset.*=.*useCallback.*\(\) => \{/);
    assert.match(checkoutFlow, /setDeliverySlotStatus\('loading'\)/);
  });

  it('validateSelectedSlot is called when scheduling changes', () => {
    const checkoutFlow = readFileSync(
      join(root, 'src/features/checkout/hooks/useCheckoutFlow.ts'),
      'utf8',
    );

    // Check that the scheduling effect calls validateSelectedSlot with normalized slots
    assert.match(checkoutFlow, /validateSelectedSlot\(current, normalizedSlots, isAsapSlot\)/);
  });

  it('scheduling effect uses ensureScheduledDeliverySlots for normalized slots', () => {
    const checkoutFlow = readFileSync(
      join(root, 'src/features/checkout/hooks/useCheckoutFlow.ts'),
      'utf8',
    );

    // The hook must normalize slots the same way the UI does (ensureScheduledDeliverySlots)
    assert.match(checkoutFlow, /const normalizedSlots = ensureScheduledDeliverySlots\(scheduling\.deliverySlots\)/);
  });

  it('deliverySlotStatus defaults to loading', () => {
    const checkoutFlow = readFileSync(
      join(root, 'src/features/checkout/hooks/useCheckoutFlow.ts'),
      'utf8',
    );

    assert.match(checkoutFlow, /deliverySlotStatus, setDeliverySlotStatus.*=.*useState<DeliverySlotStatus>\('loading'\)/);
  });
});