/**
 * Menu lag analyzer (M7 PR-10).
 */

import {
  buildMenuProjectionLagMetrics,
  type MenuProjectionLagMetrics,
  type MenuProjectionLagSample,
} from '../../../domain/menu/operations/MenuProjectionLag';
import type { MenuOperationalSample } from '../../../domain/menu/operations/MenuOperationalRules';

export class MenuLagAnalyzer {
  analyze(sample: MenuOperationalSample, historicalMaximumLagMs = 0): MenuProjectionLagMetrics {
    const lagSample: MenuProjectionLagSample = {
      projectionName: sample.projectionName,
      lastEventProcessedAt: sample.lastEventProcessedAt,
      evaluatedAt: sample.evaluatedAt,
      checkpointUpdatedAt: sample.checkpointUpdatedAt,
    };
    return buildMenuProjectionLagMetrics(lagSample, historicalMaximumLagMs);
  }
}

export function createMenuLagAnalyzer(): MenuLagAnalyzer {
  return new MenuLagAnalyzer();
}
