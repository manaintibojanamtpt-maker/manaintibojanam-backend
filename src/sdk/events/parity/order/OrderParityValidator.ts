/**
 * Order parity validator (M6 PR-8).
 */

import type { OrderParityValidatorPort, OrderParityValidateResult } from '../../contracts/orderParityPorts';
import type { SdkResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';

export class OrderParityValidator implements OrderParityValidatorPort {
  validateOrderId(orderId: string): SdkResult<OrderParityValidateResult> {
    if (!orderId || !orderId.trim()) {
      return {
        ok: false,
        error: { code: 'VALIDATION_FAILED', message: 'orderId is required' },
      };
    }
    return sdkOk({ orderId, valid: true });
  }
}

export function createOrderParityValidator(): OrderParityValidator {
  return new OrderParityValidator();
}
