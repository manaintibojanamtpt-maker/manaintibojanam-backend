/**
 * MenuValidator port (M7 PR-1) — contract only.
 */

import type { SdkResult } from '../../core/result';
import type { MenuValidationInput, MenuValidationResult } from '../dto';

export interface MenuValidator {
  validateMenu(input: MenuValidationInput): SdkResult<MenuValidationResult>;
}
