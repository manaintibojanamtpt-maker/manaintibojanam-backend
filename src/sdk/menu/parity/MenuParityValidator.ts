/**
 * Menu parity validator (M7 PR-8).
 */

import type { MenuParityValidatorPort, MenuParityValidateResult } from './menuParityPorts';
import type { SdkResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';

export class MenuParityValidator implements MenuParityValidatorPort {
  validateCatalogId(catalogId: string): SdkResult<MenuParityValidateResult> {
    if (!catalogId || !catalogId.trim()) {
      return {
        ok: false,
        error: { code: 'VALIDATION', message: 'catalogId is required' },
      };
    }
    return sdkOk({ catalogId, valid: true });
  }
}

export function createMenuParityValidator(): MenuParityValidator {
  return new MenuParityValidator();
}
