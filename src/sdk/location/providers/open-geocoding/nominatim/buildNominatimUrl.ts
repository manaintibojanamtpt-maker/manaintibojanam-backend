/**
 * LocationSDK — Nominatim URL builders (M2 PR-8).
 */

import type { NominatimReverseQuery, NominatimSearchQuery } from './nominatimTypes';

const appendQuery = (baseUrl: string, params: Record<string, string>): string => {
  const url = new URL(baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
};

export function buildNominatimSearchUrl(
  baseUrl: string,
  query: Omit<NominatimSearchQuery, 'format' | 'addressdetails'>
): string {
  const params: Record<string, string> = {
    q: query.q,
    format: 'json',
    addressdetails: '1',
    limit: query.limit,
  };
  if (query.countrycodes) {
    params.countrycodes = query.countrycodes;
  }
  return appendQuery(`${baseUrl.replace(/\/$/, '')}/search`, params);
}

export function buildNominatimReverseUrl(
  baseUrl: string,
  query: Omit<NominatimReverseQuery, 'format' | 'addressdetails'>
): string {
  const params: Record<string, string> = {
    lat: query.lat,
    lon: query.lon,
    format: 'json',
    addressdetails: '1',
  };
  return appendQuery(`${baseUrl.replace(/\/$/, '')}/reverse`, params);
}
