import { Tenant, Order } from '../types';
import { TenantAnalytics } from './AnalyticsService';
import { CustomerSegmentSummary } from './CustomerIntelligenceService';

export interface AIGrowthRecommendation {
  type: 'Risk' | 'Opportunity' | 'Recovery';
  category: 'Revenue' | 'Customer' | 'Inventory' | 'Delivery' | 'Compliance' | 'Growth';
  message: string;
  actionTitle: string;
  actionPayload?: any; 
  potentialRecovery: number;
  confidenceScore: number; // 0-100
}

export interface AIGrowthSnapshot {
  summary: string;
  risks: string[];
  recommendations: AIGrowthRecommendation[];
  expectedRevenueRecovery: number;
}

export const generateDailyGrowthSnapshot = (
  tenant: Tenant,
  analytics: TenantAnalytics | null,
  segments: CustomerSegmentSummary | null,
  orders: Order[]
): AIGrowthSnapshot => {
  const recommendations: AIGrowthRecommendation[] = [];
  const risks: string[] = [];
  
  let summary = `Good Morning. `;
  let expectedRevenueRecovery = 0;

  // Evaluate Revenue / Sales Trend
  const previousMonthRev = analytics?.previousMonth?.revenue || 0;
  const currentMonthRev = analytics?.currentMonth?.revenue || 0;
  if (previousMonthRev > 0 && currentMonthRev > 0) {
    const trend = (currentMonthRev - previousMonthRev) / previousMonthRev;
    if (trend < 0) {
      const dropPct = Math.round(Math.abs(trend) * 100);
      summary += `Revenue is trending down ${dropPct}%. `;
      risks.push('Revenue Risk: Sales velocity has dropped compared to last month.');
      
      recommendations.push({
        type: 'Opportunity',
        category: 'Revenue',
        message: `Weekend demand forecast is increasing. Launch a Family Combo to boost Average Order Value.`,
        actionTitle: 'Launch Family Combo',
        actionPayload: { campaignType: 'combo' },
        potentialRecovery: Math.round(Math.abs(currentMonthRev - previousMonthRev) * 0.5),
        confidenceScore: 85
      });
    } else {
      summary += `Revenue is up ${Math.round(trend * 100)}%! `;
    }
  } else {
    summary += `Revenue tracking is initializing. `;
  }

  // Evaluate Retention & Customer Risk
  if (segments && segments.inactive > 0) {
    summary += `${segments.inactive} repeat customers are at risk of churning. `;
    risks.push('Customer Risk: Elevated churn detected in the repeat segment.');
    
    recommendations.push({
      type: 'Recovery',
      category: 'Customer',
      message: `Reactivate ${segments.inactive} Customers with a personalized Win-Back WhatsApp campaign.`,
      actionTitle: 'Send Win-Back Campaign',
      actionPayload: { campaignType: 'win_back' },
      potentialRecovery: segments.inactive * 350,
      confidenceScore: 92
    });
  }

  // Evaluate Inventory Risk (Mock logic since we don't pass full menu stock here, assuming we check tenant settings or generic flag)
  // In a real app we'd map this to actual inventory limits.
  if (tenant.status === 'active') {
      recommendations.push({
        type: 'Risk',
        category: 'Inventory',
        message: `Historical data shows high biryani demand on Fridays. Ensure 20% extra stock to prevent out-of-stock lockouts.`,
        actionTitle: 'Review Inventory Planning',
        potentialRecovery: 2500,
        confidenceScore: 78
      });
  }

  // Evaluate Delivery & Logistics Risk
  if (tenant.deliveryConfig && tenant.deliveryConfig.maxRadius < 10) {
    recommendations.push({
      type: 'Opportunity',
      category: 'Delivery',
      message: `Extend Delivery Radius by 2km to reach an estimated 500+ new households with minimal logistics overhead.`,
      actionTitle: 'Extend Delivery Radius',
      potentialRecovery: 5000,
      confidenceScore: 65
    });
  }

  // Evaluate Compliance Risk
  if (tenant.fssai?.verificationStatus === 'compliance_overdue' || (tenant.fssai?.expiryDate && new Date(tenant.fssai.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))) {
     risks.push('Compliance Risk: FSSAI License is nearing expiry or overdue.');
     recommendations.push({
        type: 'Risk',
        category: 'Compliance',
        message: `Your FSSAI license is approaching expiry. Renew now to avoid store suspension.`,
        actionTitle: 'Update FSSAI Documents',
        actionPayload: { path: '/owner/kyc' },
        potentialRecovery: 0,
        confidenceScore: 99
     });
  }

  // Evaluate Growth & VIP Opportunities
  if (segments && segments.vip > 0) {
    recommendations.push({
      type: 'Opportunity',
      category: 'Growth',
      message: `Maintain momentum by rewarding your top ${segments.vip} VIP customers with an exclusive early-access menu item.`,
      actionTitle: 'Launch VIP Campaign',
      potentialRecovery: segments.vip * 600,
      confidenceScore: 88
    });
  }

  expectedRevenueRecovery = recommendations.reduce((acc, rec) => acc + rec.potentialRecovery, 0);

  return {
    summary,
    risks,
    recommendations,
    expectedRevenueRecovery
  };
};
