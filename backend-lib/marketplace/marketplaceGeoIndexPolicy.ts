/** Marketplace geoIndex feature gate — enabled unless explicitly disabled. */
export function isMarketplaceGeoIndexEnabled(): boolean {
  return process.env.FF_MARKETPLACE_GEOINDEX !== 'false';
}
