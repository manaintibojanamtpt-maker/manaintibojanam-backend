/**
 * Maps SDK OrderReadModel to legacy Order shape for presentation layers (PR-4/PR-5).
 */

import type { OrderReadModel } from '../sdk/orders/types';
import { FeedbackStatus, Order, OrderStatus } from '../types';

export const readModelToOrder = (model: OrderReadModel): Order =>
  ({
    ...model,
    userId: model.userId ?? '',
    customerName: model.customerName ?? 'Customer',
    phone: model.phone ?? '',
    gst: model.gst ?? 0,
    packingFee: model.packingFee ?? 0,
    deliveryFee: model.deliveryFee ?? 0,
    address: model.address ?? '',
    status: model.status as OrderStatus,
    paymentMethod: model.paymentMethod,
    paymentStatus: model.paymentStatus,
    items: [...model.items],
    feedbackStatus: model.feedbackStatus ?? FeedbackStatus.NOT_ELIGIBLE,
    createdAt: model.createdAt,
  }) as Order;
