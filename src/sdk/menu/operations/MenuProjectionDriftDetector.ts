/**
 * Menu projection drift detector (M7 PR-10).
 */

import {
  detectMenuProjectionDrift,
  type MenuProjectionDriftReport,
  type MenuProjectionDriftSample,
} from '../../../domain/menu/operations/MenuProjectionDrift';
import type { MenuOperationalSample } from '../../../domain/menu/operations/MenuOperationalRules';
import type { MenuOperationalThresholds } from '../../../domain/menu/operations/MenuOperationalThresholds';
import { DEFAULT_MENU_OPERATIONAL_THRESHOLDS } from '../../../domain/menu/operations/MenuOperationalThresholds';

export class MenuProjectionDriftDetector {
  constructor(
    private readonly thresholds: MenuOperationalThresholds = DEFAULT_MENU_OPERATIONAL_THRESHOLDS
  ) {}

  detect(sample: MenuOperationalSample): MenuProjectionDriftReport {
    const driftSample: MenuProjectionDriftSample = {
      projectionName: sample.projectionName,
      processedEvents: sample.processedEvents,
      duplicateEvents: sample.duplicateEvents,
      droppedEvents: sample.droppedEvents,
      missingEvents: sample.missingEvents,
      outOfOrderEvents: sample.outOfOrderEvents,
    };
    return detectMenuProjectionDrift(
      driftSample,
      this.thresholds.maxDuplicatePercent,
      this.thresholds.maxDroppedEventPercent,
      this.thresholds.maxCriticalDriftCount
    );
  }
}

export function createMenuProjectionDriftDetector(
  thresholds?: Partial<MenuOperationalThresholds>
): MenuProjectionDriftDetector {
  return new MenuProjectionDriftDetector({
    ...DEFAULT_MENU_OPERATIONAL_THRESHOLDS,
    ...thresholds,
  });
}
