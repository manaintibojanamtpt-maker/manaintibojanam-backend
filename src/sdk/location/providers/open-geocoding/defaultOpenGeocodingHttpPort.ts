/**
 * LocationSDK — default fetch HTTP port for Open Geocoding (M2 PR-8).
 * Not used in unit tests — inject a mock OpenGeocodingHttpPort instead.
 */

import { sdkFromError, sdkOk } from '../../../core/resultHelpers';
import type { OpenGeocodingHttpPort } from './OpenGeocodingPorts';

export function createFetchOpenGeocodingHttpPort(): OpenGeocodingHttpPort {
  return {
    async get(url, headers, timeoutMs) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });
        const body = await response.text();
        return sdkOk({ status: response.status, body });
      } catch (error) {
        return sdkFromError(error, 'UNAVAILABLE');
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
