/**
 * Menu replay validator (M7 PR-10).
 */

import {
  evaluateMenuReplayHealth,
  type MenuReplayHealth,
} from '../../../domain/menu/operations/MenuReplayHealth';
import type { MenuOperationalSample } from '../../../domain/menu/operations/MenuOperationalRules';
import type { MenuOperationalThresholds } from '../../../domain/menu/operations/MenuOperationalThresholds';
import { DEFAULT_MENU_OPERATIONAL_THRESHOLDS } from '../../../domain/menu/operations/MenuOperationalThresholds';

export class MenuReplayValidator {
  constructor(
    private readonly thresholds: MenuOperationalThresholds = DEFAULT_MENU_OPERATIONAL_THRESHOLDS
  ) {}

  validate(sample: MenuOperationalSample): MenuReplayHealth {
    return evaluateMenuReplayHealth(
      {
        projectionName: sample.projectionName,
        replayAttempts: sample.replayAttempts,
        replaySuccesses: sample.replaySuccesses,
      },
      this.thresholds.minReplaySuccessPercent
    );
  }
}

export function createMenuReplayValidator(
  thresholds?: Partial<MenuOperationalThresholds>
): MenuReplayValidator {
  return new MenuReplayValidator({
    ...DEFAULT_MENU_OPERATIONAL_THRESHOLDS,
    ...thresholds,
  });
}
