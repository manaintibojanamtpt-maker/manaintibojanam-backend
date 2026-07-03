/**
 * M8 PR-5 — Pricing facade factory.
 */

import { PricingFacade, createPricingFacadeDeps, type PricingFacadeDeps } from './PricingFacade';

export function createPricingFacade(deps: PricingFacadeDeps = {}): PricingFacade {
  return new PricingFacade(deps);
}

export { createPricingFacadeDeps, isPricingEnabled, readPricingFlag } from './PricingFacade';
