/**
 * LocationSDK — stub browser location provider (M2 PR-7).
 * Does not access navigator.geolocation.
 */

import { sdkOk } from '../../../core/resultHelpers';
import { locationNotConfiguredAsync } from '../../adapters/notConfigured';
import type { BrowserLocationProvider } from '../BrowserLocationProvider';

export function createStubBrowserLocationProvider(): BrowserLocationProvider {
  return {
    kind: 'stub',
    isSupported: () => sdkOk(false),
    detectCurrentLocation: () =>
      locationNotConfiguredAsync('detectCurrentLocation', 'StubBrowserLocationProvider'),
  };
}
