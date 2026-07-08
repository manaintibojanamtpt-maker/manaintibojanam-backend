export const trackingQueryKeys = {
  all: ['tracking'] as const,
  order: (orderId: string, mode: 'auth' | 'guest', phone?: string) =>
    [...trackingQueryKeys.all, orderId, mode, phone ?? ''] as const,
};
