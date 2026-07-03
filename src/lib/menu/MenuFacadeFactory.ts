/**
 * M7 PR-5 — Menu facade factory.
 */

import { MenuFacade, createMenuFacadeDeps, type MenuFacadeDeps } from './MenuFacade';

export function createMenuFacade(deps: MenuFacadeDeps = {}): MenuFacade {
  return new MenuFacade(deps);
}

export { createMenuFacadeDeps, isMenuEnabled } from './MenuFacade';
