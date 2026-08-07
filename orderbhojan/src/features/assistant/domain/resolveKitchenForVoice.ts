/**
 * Purpose: Resolve kitchen + menu for voice ordering (Menu Agent grounding).
 * Uses marketplace search/discovery — never invents slugs from display names.
 */

import { getMarketplaceApiClient } from '@/marketplace-api';
import { MarketplaceApiError } from '@/marketplace-api/errors';
import type { SearchHit } from '@/types/marketplace';
import { prefetchKitchenMenuForAssist } from '../application/prefetchKitchenMenuForAssist';
import { buildOrderingAssistContext } from './buildOrderingAssistContext';
import { matchKitchenFragmentInMessage } from './matchOrderingVocabulary';
import {
  expandIndicOrderingUtterance,
  normalizeOrderingText,
} from './orderingTextNormalize';
import type { OrderingAssistContextPayload } from './buildOrderingAssistContext';

export type ResolvedKitchen = {
  readonly restaurantId: string;
  readonly restaurantSlug: string;
  readonly displayName: string;
};

function kitchenFromHit(hit: SearchHit): ResolvedKitchen | null {
  const restaurantId = hit.restaurant?.restaurantId?.trim() || '';
  const restaurantSlug = hit.restaurant?.restaurantSlug?.trim() || '';
  const displayName =
    hit.restaurant?.displayName?.trim() || hit.label?.trim() || '';
  if (!restaurantId || !restaurantSlug) return null;
  return { restaurantId, restaurantSlug, displayName: displayName || restaurantSlug };
}

/**
 * Resolve kitchen via nearby hints first, then marketplace search (authoritative slug).
 */
export async function resolveKitchenForVoiceUtterance(params: {
  readonly message: string;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly nearbyKitchens?: readonly { readonly id?: string; readonly name: string }[];
}): Promise<ResolvedKitchen | null> {
  const expanded = expandIndicOrderingUtterance(params.message);
  const nearby = params.nearbyKitchens ?? [];

  const localHit = matchKitchenFragmentInMessage(expanded, nearby);
  if (localHit?.id?.trim()) {
    const fromNearby: ResolvedKitchen = {
      restaurantId: localHit.id.trim(),
      restaurantSlug: localHit.id.trim().replace(/^obr[_-]/i, ''),
      displayName: localHit.name,
    };
    const upgraded = await searchKitchen(expanded, params.lat, params.lng, fromNearby.displayName);
    return upgraded ?? fromNearby;
  }

  return searchKitchen(expanded, params.lat, params.lng);
}

async function searchKitchen(
  query: string,
  lat?: number | null,
  lng?: number | null,
  preferName?: string,
): Promise<ResolvedKitchen | null> {
  const searchQ = (preferName || extractKitchenQuery(query)).trim();
  if (searchQ.length < 2) return null;
  const useLat = typeof lat === 'number' ? lat : 18.5204;
  const useLng = typeof lng === 'number' ? lng : 73.8567;

  try {
    const result = await getMarketplaceApiClient().search({
      q: searchQ,
      type: 'restaurant',
      lat: useLat,
      lng: useLng,
      limit: 8,
    });
    const hits = result.hits ?? [];
    if (!hits.length) return null;

    const ranked = hits
      .map((hit) => {
        const k = kitchenFromHit(hit);
        if (!k) return null;
        return { k, score: scoreKitchenLabel(query, k.displayName) };
      })
      .filter((e): e is { k: ResolvedKitchen; score: number } => Boolean(e && e.score >= 0.45))
      .sort((a, b) => b.score - a.score);

    return ranked[0]?.k ?? kitchenFromHit(hits[0]!);
  } catch (err) {
    if (err instanceof MarketplaceApiError && err.status === 404) return null;
    return null;
  }
}

function extractKitchenQuery(message: string): string {
  const expanded = expandIndicOrderingUtterance(message);
  const inti = expanded.match(/inti\s*bhojanam[\w\s-]*/i);
  if (inti) return 'inti bhojanam';
  const mana = expanded.match(/mana\s*inti|manaintibojanam/i);
  if (mana) return 'manaintibojanam';
  return expanded
    .replace(/\b(rendu|two|2|three|3|add|quantity|times|from|nundi|antibody)\b/giu, ' ')
    .replace(/\b(masala\s*dosa|dosa|idli|wada|biryani)\b/giu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 64) || expanded.slice(0, 64);
}

function scoreKitchenLabel(query: string, label: string): number {
  const q = normalizeOrderingText(query);
  const l = normalizeOrderingText(label);
  if (!l) return 0;
  if (l.includes('inti') && (q.includes('inti') || /ఇంటి|antibody/i.test(query))) return 0.95;
  if (l.includes('mana') && /mana|మన/.test(q)) return 0.9;
  if (q.includes(l.slice(0, Math.min(8, l.length)))) return 0.7;
  return 0.5;
}

/**
 * Full Menu-Agent ground step: resolve kitchen, prefetch menu, build assist context.
 */
export async function groundVoiceOrderingContext(params: {
  readonly message: string;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly areaLabel?: string | null;
  readonly activeRestaurantId?: string | null;
  readonly activeRestaurantSlug?: string | null;
  readonly nearbyKitchens?: readonly { readonly id?: string; readonly name: string }[];
}): Promise<{
  readonly kitchen: ResolvedKitchen | null;
  readonly orderingContext: OrderingAssistContextPayload | null;
  readonly menuItemCount: number;
  readonly expandedMessage: string;
}> {
  const expandedMessage = expandIndicOrderingUtterance(params.message);
  const kitchen =
    (await resolveKitchenForVoiceUtterance({
      message: expandedMessage,
      lat: params.lat,
      lng: params.lng,
      nearbyKitchens: params.nearbyKitchens,
    })) ||
    (params.activeRestaurantId && params.activeRestaurantSlug
      ? {
          restaurantId: params.activeRestaurantId,
          restaurantSlug: params.activeRestaurantSlug,
          displayName: params.activeRestaurantSlug,
        }
      : null);

  let menuItemCount = 0;
  if (kitchen) {
    menuItemCount = await prefetchKitchenMenuForAssist({
      restaurantId: kitchen.restaurantId,
      restaurantSlug: kitchen.restaurantSlug,
      restaurantName: kitchen.displayName,
      lat: params.lat,
      lng: params.lng,
      force: true,
    });
  }

  const nearby =
    params.nearbyKitchens?.length
      ? params.nearbyKitchens
      : kitchen
        ? [{ id: kitchen.restaurantId, name: kitchen.displayName }]
        : [];

  // Ensure resolved kitchen is in nearby hints for restaurantId resolution.
  const nearbyWithResolved =
    kitchen && !nearby.some((k) => k.id === kitchen.restaurantId)
      ? [{ id: kitchen.restaurantId, name: kitchen.displayName }, ...nearby]
      : nearby;

  const orderingContext = buildOrderingAssistContext({
    restaurantId: kitchen?.restaurantId ?? params.activeRestaurantId,
    restaurantSlug: kitchen?.restaurantSlug ?? params.activeRestaurantSlug,
    restaurantName: kitchen?.displayName,
    areaLabel: params.areaLabel,
    lat: params.lat,
    lng: params.lng,
    preferRestaurantId: kitchen?.restaurantId,
    nearbyKitchens: nearbyWithResolved,
  });

  return { kitchen, orderingContext, menuItemCount, expandedMessage };
}
