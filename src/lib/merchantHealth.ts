import { Tenant } from '../types';
import { TenantAnalytics } from '../services/AnalyticsService';

export interface MerchantHealthResult {
  score: number;
  status: 'Healthy' | 'Warning' | 'At Risk' | 'Critical';
  breakdown: {
    orders: number;
    revenue: number;
    retention: number;
    compliance: number;
    menuCompleteness: number;
    subscription: number;
  };
}

export const calculateMerchantHealth = (
  tenant: Tenant,
  analytics?: TenantAnalytics,
  totalMenuItems: number = 0
): MerchantHealthResult => {
  // Weights (Total 100)
  // Orders = 25
  // Revenue = 20
  // Retention = 20
  // Compliance = 15
  // Menu Completeness = 10
  // Subscription Standing = 10

  let ordersScore = 0;
  let revenueScore = 0;
  let retentionScore = 0;
  let complianceScore = 0;
  let menuScore = 0;
  let subscriptionScore = 0;

  // 1. Orders (Max 25)
  // Assuming a benchmark of 50+ monthly orders is perfect (100% of 25 = 25 points)
  const monthlyOrders = analytics?.currentMonth?.orders || 0;
  if (monthlyOrders >= 50) ordersScore = 25;
  else if (monthlyOrders >= 20) ordersScore = 15;
  else if (monthlyOrders > 0) ordersScore = 5;

  // 2. Revenue (Max 20)
  // Benchmark 50000+ is perfect
  const monthlyRevenue = analytics?.currentMonth?.revenue || 0;
  if (monthlyRevenue >= 50000) revenueScore = 20;
  else if (monthlyRevenue >= 10000) revenueScore = 10;
  else if (monthlyRevenue > 0) revenueScore = 5;

  // 3. Retention (Max 20)
  // Benchmark 70%+ is perfect
  const retentionRate = analytics?.customerRetentionRate || 0; // assumed 0-100 percentage
  if (retentionRate >= 70) retentionScore = 20;
  else if (retentionRate >= 40) retentionScore = 10;
  else if (retentionRate > 0) retentionScore = 5;

  // 4. Compliance (Max 15)
  // FSSAI verified = 7.5, KYC verified = 7.5
  if (tenant.fssai?.verificationStatus === 'verified') complianceScore += 7.5;
  if (tenant.kyc?.emailVerificationStatus === 'verified' && tenant.kyc?.verificationLevel && tenant.kyc.verificationLevel >= 2) {
    complianceScore += 7.5;
  } else if (tenant.kyc?.emailVerificationStatus === 'verified') {
    complianceScore += 4; // Partial compliance
  }

  // 5. Menu Completeness (Max 10)
  if (totalMenuItems >= 15) menuScore = 10;
  else if (totalMenuItems >= 5) menuScore = 5;
  else if (totalMenuItems > 0) menuScore = 2;

  // 6. Subscription Standing (Max 10)
  if (tenant.subscription?.status === 'active' && tenant.subscription?.planId !== 'starter') {
    subscriptionScore = 10;
  } else if (tenant.subscription?.status === 'trialing') {
    subscriptionScore = 8;
  } else if (tenant.subscription?.status === 'active') { // Starter
    subscriptionScore = 5;
  }

  const totalScore = Math.round(ordersScore + revenueScore + retentionScore + complianceScore + menuScore + subscriptionScore);

  let status: 'Healthy' | 'Warning' | 'At Risk' | 'Critical';
  if (totalScore >= 90) status = 'Healthy';
  else if (totalScore >= 70) status = 'Warning';
  else if (totalScore >= 50) status = 'At Risk';
  else status = 'Critical';

  return {
    score: totalScore,
    status,
    breakdown: {
      orders: ordersScore,
      revenue: revenueScore,
      retention: retentionScore,
      compliance: complianceScore,
      menuCompleteness: menuScore,
      subscription: subscriptionScore
    }
  };
};
