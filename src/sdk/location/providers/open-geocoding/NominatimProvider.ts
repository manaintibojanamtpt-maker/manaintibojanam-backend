/**
 * LocationSDK — Nominatim backend for OpenGeocodingProvider (M2 PR-8).
 */

import type { SdkAsyncResult, SdkResult } from '../../../core/result';
import { sdkError, sdkFail, sdkOk } from '../../../core/resultHelpers';
import type { OpenGeocodingConfig } from './OpenGeocodingConfig';
import type {
  OpenGeocodingBackend,
  OpenGeocodingBackendResult,
  OpenGeocodingHttpPort,
  OpenGeocodingReverseParams,
  OpenGeocodingSearchParams,
} from './OpenGeocodingPorts';
import { mapOpenGeocodingHttpStatus, propagateOpenGeocodingFailure } from './mapOpenGeocodingErrors';
import { buildNominatimReverseUrl, buildNominatimSearchUrl } from './nominatim/buildNominatimUrl';
import {
  mapNominatimReverseResult,
  mapNominatimSearchResults,
} from './nominatim/mapNominatimResponse';
import type { NominatimReverseResult, NominatimSearchResult } from './nominatim/nominatimTypes';

export class NominatimProvider implements OpenGeocodingBackend {
  readonly vendor = 'nominatim' as const;

  constructor(
    private readonly http: OpenGeocodingHttpPort,
    private readonly config: OpenGeocodingConfig
  ) {}

  search(params: OpenGeocodingSearchParams): SdkAsyncResult<OpenGeocodingBackendResult[]> {
    return this.searchInternal(params);
  }

  reverse(params: OpenGeocodingReverseParams): SdkAsyncResult<OpenGeocodingBackendResult> {
    return this.reverseInternal(params);
  }

  private async searchInternal(
    params: OpenGeocodingSearchParams
  ): Promise<SdkResult<OpenGeocodingBackendResult[]>> {
    const query = params.query.trim();
    if (!query) {
      return sdkFail(sdkError('VALIDATION', 'Search query is required'));
    }

    const url = buildNominatimSearchUrl(this.config.baseUrl, {
      q: query,
      limit: String(Math.min(Math.max(params.limit ?? 5, 1), 10)),
      countrycodes: params.countryCodes?.toLowerCase(),
    });

    const response = await this.http.get(
      url,
      {
        Accept: 'application/json',
        'User-Agent': this.config.userAgent,
      },
      this.config.timeoutMs
    );

    if (response.ok === false) {
      return propagateOpenGeocodingFailure(response);
    }

    if (response.value.status >= 400) {
      return mapOpenGeocodingHttpStatus(response.value.status, response.value.body);
    }

    let parsed: NominatimSearchResult[];
    try {
      parsed = JSON.parse(response.value.body) as NominatimSearchResult[];
    } catch {
      return sdkFail(sdkError('INTERNAL', 'Invalid Nominatim search response'));
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return sdkFail(sdkError('NOT_FOUND', 'No geocoding results found', { field: query }));
    }

    return sdkOk(mapNominatimSearchResults(parsed));
  }

  private async reverseInternal(
    params: OpenGeocodingReverseParams
  ): Promise<SdkResult<OpenGeocodingBackendResult>> {
    if (!Number.isFinite(params.lat) || !Number.isFinite(params.lng)) {
      return sdkFail(sdkError('VALIDATION', 'Invalid coordinates for reverse geocode'));
    }

    const url = buildNominatimReverseUrl(this.config.baseUrl, {
      lat: String(params.lat),
      lon: String(params.lng),
    });

    const response = await this.http.get(
      url,
      {
        Accept: 'application/json',
        'User-Agent': this.config.userAgent,
      },
      this.config.timeoutMs
    );

    if (response.ok === false) {
      return propagateOpenGeocodingFailure(response);
    }

    if (response.value.status >= 400) {
      return mapOpenGeocodingHttpStatus(response.value.status, response.value.body);
    }

    let parsed: NominatimReverseResult;
    try {
      parsed = JSON.parse(response.value.body) as NominatimReverseResult;
    } catch {
      return sdkFail(sdkError('INTERNAL', 'Invalid Nominatim reverse response'));
    }

    const mapped = mapNominatimReverseResult(parsed);
    if (!mapped) {
      return sdkFail(sdkError('NOT_FOUND', 'Reverse geocode returned no usable coordinates'));
    }

    return sdkOk(mapped);
  }
}

export function createNominatimProvider(
  http: OpenGeocodingHttpPort,
  config: OpenGeocodingConfig
): NominatimProvider {
  return new NominatimProvider(http, config);
}
