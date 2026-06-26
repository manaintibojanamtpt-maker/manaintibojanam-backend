/**
 * Order State Machine Service
 * Enforces strict order status transitions
 * Prevents invalid state changes (e.g., CANCELLED to PENDING)
 */

import { OrderStatus } from '../types';
import {
  LEGACY_UNPAID_CUSTOMER_DESCRIPTION,
  LEGACY_UNPAID_CUSTOMER_LABEL,
} from '../config/legacyPaymentCopy';

export class OrderStateService {
  /**
   * Valid status transitions for order lifecycle
   * Terminal statuses (DELIVERED, CANCELLED) have empty arrays
   */
  private static readonly STATE_MACHINE: Partial<Record<OrderStatus, OrderStatus[]>> = {
    [OrderStatus.CREATED]: [OrderStatus.PAYMENT_PENDING, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.SCHEDULED, OrderStatus.CANCELLED],
    [OrderStatus.DISPATCHED]: [OrderStatus.DELIVERED, OrderStatus.FAILED_DELIVERY, OrderStatus.CANCELLED],
    [OrderStatus.PAYMENT_PENDING]: [OrderStatus.PAYMENT_VERIFICATION, OrderStatus.CANCELLED, OrderStatus.PREPARING, OrderStatus.PENDING, OrderStatus.ACCEPTED],
    [OrderStatus.PAYMENT_VERIFICATION]: [OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.CANCELLED, OrderStatus.PENDING, OrderStatus.PAYMENT_PENDING],
    [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
    [OrderStatus.READY]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.COURIER_BOOKED, OrderStatus.CANCELLED],
    [OrderStatus.SCHEDULED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    [OrderStatus.COURIER_BOOKED]: [OrderStatus.PICKED_UP, OrderStatus.CANCELLED],
    [OrderStatus.PICKED_UP]: [OrderStatus.OUT_FOR_DELIVERY],
    [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
    [OrderStatus.DELIVERED]: [],  // TERMINAL - no further transitions
    [OrderStatus.FAILED_DELIVERY]: [OrderStatus.READY],  // Can retry
    [OrderStatus.EXPIRED]: [],  // TERMINAL - no further transitions
    [OrderStatus.CANCELLED]: [],  // TERMINAL - no further transitions
    [OrderStatus.PLACED]: [OrderStatus.PAYMENT_PENDING, OrderStatus.PAYMENT_VERIFICATION, OrderStatus.ACCEPTED, OrderStatus.CANCELLED, OrderStatus.EXPIRED],
    
    // Legacy status mappings
    [OrderStatus.PENDING]: [OrderStatus.PREPARING, OrderStatus.CANCELLED, OrderStatus.PAYMENT_PENDING, OrderStatus.ACCEPTED],
    [OrderStatus.ACTIVE]: []
  };

  /**
   * Validates if transition from currentStatus to newStatus is allowed
   * Returns: { valid: boolean; reason?: string }
   */
  static validateTransition(
    from: OrderStatus,
    to: OrderStatus
  ): { valid: boolean; reason?: string } {
    if (from === to) {
      return { valid: true };  // No-op is always valid
    }

    const allowedTransitions = this.STATE_MACHINE[from];
    if (!allowedTransitions) {
      return {
        valid: false,
        reason: `Unknown current status: ${from}`,
      };
    }

    if (!allowedTransitions.includes(to)) {
      return {
        valid: false,
        reason: `Cannot transition from ${from} to ${to}. Allowed: ${allowedTransitions.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Check if status is terminal (no further transitions possible)
   */
  static normalizeStatus(status: string | OrderStatus): OrderStatus | null {
    if (!status) {
      return null;
    }

    const normalized = String(status).trim().toUpperCase().replace(/\s+/g, '_');
    return Object.values(OrderStatus).includes(normalized as OrderStatus) ? (normalized as OrderStatus) : null;
  }

  static isTerminalStatus(status: string | OrderStatus): boolean {
    const normalizedStatus = this.normalizeStatus(status);
    if (!normalizedStatus) return false;
    return this.STATE_MACHINE[normalizedStatus]?.length === 0;
  }

  /**
   * Get customer-friendly status label, icon, and color
   */
  static getStatusDisplay(status: OrderStatus) {
    const mapping: Partial<Record<
      OrderStatus,
      { label: string; icon: string; color: string; description?: string }
    >> = {
      [OrderStatus.CREATED]: {
        label: 'Order Created',
        icon: '📋',
        color: 'gray',
        description: 'Your order has been created',
      },
      [OrderStatus.PAYMENT_PENDING]: {
        label: 'Waiting for Payment',
        icon: '💳',
        color: 'yellow',
        description: 'Please complete payment to proceed',
      },
      [OrderStatus.PAYMENT_VERIFICATION]: {
        label: LEGACY_UNPAID_CUSTOMER_LABEL,
        icon: '⚠️',
        color: 'yellow',
        description: LEGACY_UNPAID_CUSTOMER_DESCRIPTION,
      },
      [OrderStatus.PENDING]: {
        label: 'Pending',
        icon: '⏳',
        color: 'yellow',
        description: 'Your order is being processed',
      },

      [OrderStatus.PLACED]: {
        label: 'Order Placed',
        icon: '✅',
        color: 'green',
      },
      [OrderStatus.ACCEPTED]: {
        label: 'Accepted',
        icon: '👍',
        color: 'orange',
        description: 'Your order has been accepted by the restaurant',
      },
      [OrderStatus.PREPARING]: {
        label: 'Preparing',
        icon: '👨‍🍳',
        color: 'orange',
        description: 'Our team is preparing your delicious meal',
      },
      [OrderStatus.READY]: {
        label: 'Ready for Pickup',
        icon: '📦',
        color: 'green',
        description: 'Your order is ready!',
      },
      [OrderStatus.COURIER_BOOKED]: {
        label: 'Courier Booked',
        icon: '🚗',
        color: 'blue',
        description: 'A courier has been assigned',
      },
      [OrderStatus.PICKED_UP]: {
        label: 'Picked Up',
        icon: '📦',
        color: 'blue',
        description: 'Your order has been picked up',
      },
      [OrderStatus.OUT_FOR_DELIVERY]: {
        label: 'Out for Delivery',
        icon: '🛵',
        color: 'blue',
        description: 'Your food is on the way',
      },
      [OrderStatus.DELIVERED]: {
        label: 'Delivered',
        icon: '✨',
        color: 'green',
        description: 'Enjoy your meal!',
      },
      [OrderStatus.FAILED_DELIVERY]: {
        label: 'Delivery Failed',
        icon: '❌',
        color: 'red',
        description: 'Delivery could not be completed',
      },
      [OrderStatus.CANCELLED]: {
        label: 'Cancelled',
        icon: '✂️',
        color: 'gray',
        description: 'This order has been cancelled',
      },
      [OrderStatus.CONFIRMED]: {
        label: 'Confirmed',
        icon: '✅',
        color: 'green',
      },
      [OrderStatus.SCHEDULED]: {
        label: 'Scheduled',
        icon: '⏰',
        color: 'blue',
      },
      [OrderStatus.DISPATCHED]: {
        label: 'Dispatched',
        icon: '🚚',
        color: 'blue',
      },
      [OrderStatus.EXPIRED]: {
        label: 'Expired',
        icon: '⏳',
        color: 'gray',
      },
      [OrderStatus.ACTIVE]: {
        label: 'Active',
        icon: '🟢',
        color: 'green',
      },
    };

    return (
      mapping[status] || {
        label: status,
        icon: '❓',
        color: 'gray',
      }
    );
  }

  /**
   * Get all possible next statuses for current status
   */
  static getNextStatuses(currentStatus: OrderStatus): OrderStatus[] {
    return this.STATE_MACHINE[currentStatus] || [];
  }

  /**
   * Check if user can cancel order given its current status
   */
  static canCancel(status: OrderStatus): boolean {
    return this.getNextStatuses(status).includes(OrderStatus.CANCELLED);
  }
}
