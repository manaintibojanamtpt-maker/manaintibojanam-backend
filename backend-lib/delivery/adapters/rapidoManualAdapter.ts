/**
 * Rapido — manual fallback only.
 * No public merchant delivery onboarding docs found; do not attempt API booking.
 */

import type {
  DeliveryDispatchRequest,
  DeliveryDispatchResult,
  DeliveryProviderAdapter,
} from './types.js';

export const rapidoManualAdapter: DeliveryProviderAdapter = {
  provider: 'rapido',

  async validateCredentials() {
    return {
      ok: true,
      message:
        'Rapido is manual-only. Paste the Rapido tracking link at dispatch; no API credentials required.',
    };
  },

  async createDispatch(
    _credentials,
    request: DeliveryDispatchRequest,
  ): Promise<DeliveryDispatchResult> {
    return {
      provider: 'rapido',
      tripId: `rapido_manual_${request.orderId}`,
      status: 'manual_fallback',
      message:
        'Rapido has no merchant API onboarding in BhojanOS yet. Confirm dispatch with a pasted tracking URL.',
    };
  },
};
