import { ownerApiRequest } from './ownerProvisioning';
import type { TenantAnalytics } from '../services/AnalyticsService';

export type OwnerAnalyticsBackfillSummary = Pick<
  TenantAnalytics,
  'totalRevenue' | 'totalOrders' | 'averageOrderValue' | 'customerCount' | 'repeatCustomers' | 'lastUpdated'
>;

export async function fetchOwnerAnalytics(tenantId: string) {
  return ownerApiRequest<{
    success: boolean;
    tenantId: string;
    analytics: TenantAnalytics | null;
  }>('GET', `/api/owner/analytics?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function backfillOwnerAnalytics(tenantId: string) {
  return ownerApiRequest<{
    success: boolean;
    tenantId: string;
    analytics: OwnerAnalyticsBackfillSummary;
  }>('POST', '/api/owner/analytics/backfill', { tenantId });
}

export async function recordOwnerOrderCompletion(
  tenantId: string,
  order: { totalAmount?: number; userId?: string; phone?: string; status?: string },
) {
  return ownerApiRequest<{ success: boolean; tenantId: string }>(
    'POST',
    '/api/owner/analytics/order-completion',
    { tenantId, order },
  );
}
