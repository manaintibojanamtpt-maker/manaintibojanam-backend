export const ordersQueryKeys = {
  all: ['orders'] as const,
  list: () => [...ordersQueryKeys.all, 'list'] as const,
  detail: (orderId: string) => [...ordersQueryKeys.all, 'detail', orderId] as const,
};
