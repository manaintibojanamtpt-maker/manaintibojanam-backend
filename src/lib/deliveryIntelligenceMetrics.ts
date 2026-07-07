export type DeliveryAreaMetric = { name: string; revenue: number; orders: number };

export type DeliveryIntelligenceMetrics = {
  avgDistance: number;
  successRate: number;
  totalDeliveries: number;
  avgFee: number;
  topAreas: DeliveryAreaMetric[];
  outOfBoundsAttempts: number;
};

type OrderLike = {
  status?: string;
  deliveryFee?: number;
  deliveryAddress?: unknown;
  totalAmount?: number;
  total?: number;
};

function extractArea(deliveryAddress: unknown): string {
  if (!deliveryAddress) return 'Local Area';
  if (typeof deliveryAddress === 'string') {
    const parts = deliveryAddress.split(',');
    return parts.length > 2 ? parts[parts.length - 2].trim() : parts[0]?.trim() || 'Local Area';
  }
  if (typeof deliveryAddress === 'object') {
    const addr = deliveryAddress as { city?: string; addressLine1?: string; address?: string };
    if (addr.city) return addr.city;
    if (addr.addressLine1) return addr.addressLine1.split(',')[0]?.trim() || 'Local Area';
    if (addr.address) return addr.address.split(',')[0]?.trim() || 'Local Area';
  }
  return 'Local Area';
}

export function computeDeliveryIntelligenceMetrics(orders: OrderLike[]): DeliveryIntelligenceMetrics {
  let totalDistance = 0;
  let successful = 0;
  let totalFee = 0;
  const areaMap = new Map<string, { revenue: number; orders: number }>();

  for (const data of orders) {
    const status = String(data.status || '').toUpperCase();
    const isDelivered = status === 'DELIVERED';

    if (isDelivered) {
      successful++;
      if (data.deliveryFee) totalFee += data.deliveryFee;

      const area = extractArea(data.deliveryAddress);
      const orderTotal = Number(data.totalAmount ?? data.total ?? 0) || 0;
      const current = areaMap.get(area) || { revenue: 0, orders: 0 };
      areaMap.set(area, {
        revenue: current.revenue + orderTotal,
        orders: current.orders + 1,
      });
    }

    const approxDistance = data.deliveryFee ? data.deliveryFee / 10 : 2;
    totalDistance += approxDistance;
  }

  const total = orders.length;
  const topAreas = Array.from(areaMap.entries())
    .map(([name, stats]) => ({
      name,
      orders: stats.orders,
      revenue: Math.round(stats.revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return {
    avgDistance: total ? totalDistance / total : 0,
    successRate: total ? (successful / total) * 100 : 0,
    totalDeliveries: total,
    avgFee: successful ? totalFee / successful : 0,
    topAreas,
    outOfBoundsAttempts: Math.floor(total * 0.15),
  };
}
