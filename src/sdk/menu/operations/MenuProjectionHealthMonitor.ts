/**
 * Menu projection health monitor (M7 PR-10).
 */

import {
  buildMenuOperationalMetrics,
  evaluateMenuOperationalHealth,
  type MenuOperationalMetrics,
} from '../../../domain/menu/operations/MenuOperationalRules';
import type { MenuProjectionHealth } from '../../../domain/menu/operations/MenuProjectionHealth';
import type { MenuOperationalSample } from '../../../domain/menu/operations/MenuOperationalRules';
import type { MenuOperationalThresholds } from '../../../domain/menu/operations/MenuOperationalThresholds';
import { DEFAULT_MENU_OPERATIONAL_THRESHOLDS } from '../../../domain/menu/operations/MenuOperationalThresholds';

export class MenuProjectionHealthMonitor {
  constructor(
    private readonly thresholds: MenuOperationalThresholds = DEFAULT_MENU_OPERATIONAL_THRESHOLDS
  ) {}

  metrics(sample: MenuOperationalSample): MenuOperationalMetrics {
    return buildMenuOperationalMetrics(sample);
  }

  health(metrics: MenuOperationalMetrics, driftDetected: boolean): MenuProjectionHealth {
    return evaluateMenuOperationalHealth(metrics, driftDetected, this.thresholds);
  }
}

export function createMenuProjectionHealthMonitor(
  thresholds?: Partial<MenuOperationalThresholds>
): MenuProjectionHealthMonitor {
  return new MenuProjectionHealthMonitor({
    ...DEFAULT_MENU_OPERATIONAL_THRESHOLDS,
    ...thresholds,
  });
}
