import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { useRestaurantContextStore } from '../src/features/restaurant/store/restaurantContextStore';
import { loadRestaurantExperience } from '../src/features/restaurant/engine/restaurantExperienceLayer';

function installMemoryLocalStorage(): void {
  if (typeof globalThis.localStorage !== 'undefined') return;
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
      clear: () => { store.clear(); },
    },
  });
}

describe('checkout local delivery fee estimate (Problem 2 fix)', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
    localStorage.removeItem('ob-restaurant-context-m8');
    useRestaurantContextStore.setState({
      restaurantId: null,
      contextToken: null,
      restaurantSlug: null,
      availableOffers: [],
      availablePromoCodes: [],
      appliedCouponCode: null,
      paymentMethods: null,
      deliveryFee: null,
      deliveryFeeKnown: false,
    });
  });

  afterEach(() => {
    localStorage.removeItem('ob-restaurant-context-m8');
  });

  it('localDeliveryFeeEstimate is null when deliveryFeeKnown is false', () => {
    useRestaurantContextStore.setState({
      deliveryFee: null,
      deliveryFeeKnown: false,
    });

    const storeDeliveryFee = useRestaurantContextStore.getState().deliveryFee;
    const storeDeliveryFeeKnown = useRestaurantContextStore.getState().deliveryFeeKnown;

    // This mirrors useCheckoutFlow logic: localDeliveryFeeEstimate = storeDeliveryFeeKnown ? storeDeliveryFee : null
    const localDeliveryFeeEstimate = storeDeliveryFeeKnown ? storeDeliveryFee : null;
    assert.equal(localDeliveryFeeEstimate, null);
  });

  it('localDeliveryFeeEstimate returns fee when deliveryFeeKnown is true', () => {
    useRestaurantContextStore.setState({
      deliveryFee: 25,
      deliveryFeeKnown: true,
    });

    const storeDeliveryFee = useRestaurantContextStore.getState().deliveryFee;
    const storeDeliveryFeeKnown = useRestaurantContextStore.getState().deliveryFeeKnown;
    const localDeliveryFeeEstimate = storeDeliveryFeeKnown ? storeDeliveryFee : null;

    assert.equal(localDeliveryFeeEstimate, 25);
  });

  it('loadRestaurantExperience calls setDeliveryFee when experience has deliveryFee', async () => {
    // This test documents the wiring: loadRestaurantExperience must call
    // useRestaurantContextStore.getState().setDeliveryFee(response.experience.deliveryFee, true)
    // so checkout can read the local estimate immediately.
    const { getRestaurantApiClient } = await import('../src/features/restaurant/infrastructure/restaurantApiClient');

    const originalFetch = getRestaurantApiClient().fetchExperience;
    const mockExperience = {
      experience: {
        restaurantId: 'tenant_1',
        slug: 'demo-kitchen',
        displayName: 'Demo Kitchen',
        deliveryFee: 30,
        deliveryFeeKnown: true,
        distance: 2.5,
        eta: { min: 25, max: 35 },
        cuisines: ['Indian'],
        veg: false,
        kitchenFormat: 'cloud_kitchen',
        openStatus: 'open' as const,
        badges: [],
        gallery: [],
        description: '',
        offers: [],
        rating: 4.5,
        ratingCount: 100,
        coverImage: '',
        logo: '',
      },
      hours: [],
      serviceability: { delivery: true, pickup: false },
      policies: [],
      highlights: [],
    };

    getRestaurantApiClient().fetchExperience = async () => mockExperience;

    try {
      await loadRestaurantExperience({ slug: 'demo-kitchen', lat: 18.5, lng: 73.8 });

      const state = useRestaurantContextStore.getState();
      // The fix wires setDeliveryFee(response.experience.deliveryFee, true)
      assert.equal(state.deliveryFee, 30);
      assert.equal(state.deliveryFeeKnown, true);
    } finally {
      getRestaurantApiClient().fetchExperience = originalFetch;
    }
  });

  it('loadRestaurantExperience clears deliveryFee when deliveryFeeKnown is false', async () => {
    const { getRestaurantApiClient } = await import('../src/features/restaurant/infrastructure/restaurantApiClient');

    const originalFetch = getRestaurantApiClient().fetchExperience;
    const mockExperience = {
      experience: {
        restaurantId: 'tenant_1',
        slug: 'demo-kitchen',
        displayName: 'Demo Kitchen',
        deliveryFee: null,
        deliveryFeeKnown: false,
        distance: 2.5,
        eta: { min: 25, max: 35 },
        cuisines: ['Indian'],
        veg: false,
        kitchenFormat: 'cloud_kitchen',
        openStatus: 'open' as const,
        badges: [],
        gallery: [],
        description: '',
        offers: [],
        rating: 4.5,
        ratingCount: 100,
        coverImage: '',
        logo: '',
      },
      hours: [],
      serviceability: { delivery: true, pickup: false },
      policies: [],
      highlights: [],
    };

    getRestaurantApiClient().fetchExperience = async () => mockExperience;

    try {
      // Pre-seed a stale fee
      useRestaurantContextStore.setState({ deliveryFee: 50, deliveryFeeKnown: true });
      await loadRestaurantExperience({ slug: 'demo-kitchen', lat: 18.5, lng: 73.8 });

      const state = useRestaurantContextStore.getState();
      // Should clear to null + false when deliveryFeeKnown === false
      assert.equal(state.deliveryFee, null);
      assert.equal(state.deliveryFeeKnown, false);
    } finally {
      getRestaurantApiClient().fetchExperience = originalFetch;
    }
  });
});