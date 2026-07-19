/** Monthly list prices — keep aligned with src/config/pricing.ts */
export const PLAN_MONTHLY_PRICES: Record<'starter' | 'growth' | 'pro' | 'enterprise', number> = {
  starter: 0,
  growth: 999,
  pro: 2999,
  enterprise: 4999,
};

export type SuperadminTenantRecord = {
  id?: string;
  status?: string;
  storeStatus?: string;
  firstOrderDate?: unknown;
  repeatOrderDate?: unknown;
  menuCount?: number;
  subscription?: {
    planId?: string;
    status?: string;
    dunningStatus?: string;
  };
  beta?: {
    isBetaUser?: boolean;
    firstOrderDate?: unknown;
    repeatOrderDate?: unknown;
  };
  kyc?: {
    status?: string;
    verificationLevel?: number;
    emailVerificationStatus?: string;
  };
  fssai?: {
    verificationStatus?: string;
  };
  location?: {
    lat?: number;
  };
};

export type TenantAnalyticsSummary = {
  totalOrders?: number;
  totalRevenue?: number;
};

export type PlatformSuperadminMetrics = {
  mrr: number;
  arr: number;
  arpu: number;
  activeTenantsCount: number;
  trialTenantsCount: number;
  suspendedTenantsCount: number;
  publishedStoresCount: number;
  activeSubscriptions: number;
  ordersProcessed: number;
  platformGmv: number;
  churnRisk: number;
  verifiedMerchants: number;
  fssaiVerified: number;
  complianceOverdue: number;
  betaMerchantsCount: number;
  betaPublishedCount: number;
  firstOrdersCount: number;
};

function planMonthlyPrice(planId?: string): number {
  if (!planId || planId === 'starter') return 0;
  return PLAN_MONTHLY_PRICES[planId as keyof typeof PLAN_MONTHLY_PRICES] ?? 0;
}

function hasFirstOrder(tenant: SuperadminTenantRecord): boolean {
  return Boolean(
    tenant.beta?.firstOrderDate ||
      tenant.firstOrderDate ||
      tenant.beta?.repeatOrderDate ||
      tenant.repeatOrderDate,
  );
}

export function computePlatformSuperadminMetrics(
  tenants: SuperadminTenantRecord[],
  analyticsByTenantId: Record<string, TenantAnalyticsSummary> = {},
): PlatformSuperadminMetrics {
  const activeTenantsCount = tenants.filter((t) => t.status === 'active').length;
  const trialTenantsCount = tenants.filter((t) => t.status === 'trialing' || t.status === 'pending').length;
  const suspendedTenantsCount = tenants.filter(
    (t) => t.status === 'suspended' || t.status === 'rejected',
  ).length;
  const publishedStoresCount = tenants.filter(
    (t) => t.storeStatus === 'published' || t.status === 'active',
  ).length;

  const payingTenants = tenants.filter(
    (t) =>
      t.subscription?.status === 'active' &&
      t.subscription.planId &&
      t.subscription.planId !== 'starter',
  );
  const activeSubscriptions = payingTenants.length;
  const mrr = payingTenants.reduce((sum, tenant) => sum + planMonthlyPrice(tenant.subscription?.planId), 0);
  const arr = mrr * 12;
  const arpu = activeSubscriptions > 0 ? Math.round(mrr / activeSubscriptions) : 0;

  let ordersProcessed = 0;
  let platformGmv = 0;
  for (const tenant of tenants) {
    const tenantId = tenant.id;
    if (!tenantId) continue;
    const analytics = analyticsByTenantId[tenantId];
    ordersProcessed += Number(analytics?.totalOrders ?? 0);
    platformGmv += Number(analytics?.totalRevenue ?? 0);
  }

  const churnRisk = tenants.filter((t) => {
    const sub = t.subscription;
    return (
      t.status === 'payment_due' ||
      sub?.status === 'past_due' ||
      sub?.dunningStatus === 'in_recovery' ||
      sub?.dunningStatus === 'suspended'
    );
  }).length;

  const verifiedMerchants = tenants.filter(
    (t) => (t.kyc?.verificationLevel ?? 0) >= 2 || t.kyc?.status === 'verified',
  ).length;
  const fssaiVerified = tenants.filter(
    (t) =>
      t.fssai?.verificationStatus === 'verified' || t.fssai?.verificationStatus === 'submitted',
  ).length;
  const complianceOverdue = tenants.filter(
    (t) => t.fssai?.verificationStatus === 'compliance_overdue',
  ).length;

  const betaMerchants = tenants.filter((t) => t.beta?.isBetaUser);
  const betaMerchantsCount = betaMerchants.length;
  const betaPublishedCount = betaMerchants.filter((t) => t.status === 'active').length;
  const firstOrdersCount = tenants.filter(hasFirstOrder).length;

  return {
    mrr,
    arr,
    arpu,
    activeTenantsCount,
    trialTenantsCount,
    suspendedTenantsCount,
    publishedStoresCount,
    activeSubscriptions,
    ordersProcessed,
    platformGmv,
    churnRisk,
    verifiedMerchants,
    fssaiVerified,
    complianceOverdue,
    betaMerchantsCount,
    betaPublishedCount,
    firstOrdersCount,
  };
}
