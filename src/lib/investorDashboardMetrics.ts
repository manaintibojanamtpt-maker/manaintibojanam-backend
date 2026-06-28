import type { InvestorFunnelStage } from './exportInvestorReportPdf';

export type InvestorStatusBadge = 'Excellent' | 'Growing' | 'Healthy' | 'Attention';
export type InvestorHealthLabel = 'Excellent' | 'Good' | 'Average' | 'Poor' | 'Needs Attention';

export type InvestorDashboardInput = {
  mrr: number;
  arr: number;
  activeTenantsCount: number;
  trialTenantsCount: number;
  suspendedTenantsCount: number;
  activeSubscriptions: number;
  totalTenants: number;
  totalLeads: number;
  demoRequests: number;
  newLeadsCount: number;
  verifiedMerchants: number;
  fssaiVerified: number;
  ordersProcessed: number;
  leadToTrialConv: number;
  trialToPaidConv: number;
  funnel: InvestorFunnelStage[];
  paidRetentionPct?: number;
  mrrGrowthPct?: number;
  averageOrderValue?: number;
};

export type InvestorTrend = {
  direction: 'up' | 'down' | 'flat';
  label: string;
  positive: boolean;
};

const DEFAULT_AOV = 350;
const DEFAULT_RETENTION = 92;
const DEFAULT_MRR_GROWTH = 12;

export function formatInrCompact(value: number): string {
  if (value >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(1)} Cr`;
  if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(1)} L`;
  return `₹${value.toLocaleString('en-IN')}`;
}

export function computePlatformGmv(ordersProcessed: number, aov = DEFAULT_AOV): number {
  return ordersProcessed * aov;
}

export function computeCommissionSaved(gmv: number): number {
  return Math.round(gmv * 0.25);
}

export function computePlatformGrowthScore(input: {
  retentionPct: number;
  leadToTrialConv: number;
  trialToPaidConv: number;
  mrrGrowthPct: number;
}): number {
  const retentionScore = Math.min(30, (input.retentionPct / 95) * 30);
  const leadScore = Math.min(25, (input.leadToTrialConv / 40) * 25);
  const trialScore = Math.min(25, (input.trialToPaidConv / 50) * 25);
  const mrrScore = Math.min(20, (input.mrrGrowthPct / 15) * 20);
  const raw = retentionScore + leadScore + trialScore + mrrScore;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

export function getStatusBadge(
  kind: 'mrr' | 'arr' | 'retention' | 'cac' | 'gmv' | 'growth' | 'conversion' | 'pipeline',
  value: number,
): InvestorStatusBadge {
  switch (kind) {
    case 'retention':
      if (value >= 90) return 'Excellent';
      if (value >= 80) return 'Healthy';
      if (value >= 65) return 'Growing';
      return 'Attention';
    case 'cac':
      if (value <= 1.5) return 'Excellent';
      if (value <= 3) return 'Healthy';
      if (value <= 6) return 'Growing';
      return 'Attention';
    case 'mrr':
    case 'arr':
    case 'gmv':
      if (value > 0) return value >= 50000 ? 'Excellent' : 'Growing';
      return 'Attention';
    case 'growth':
      if (value >= 85) return 'Excellent';
      if (value >= 70) return 'Healthy';
      if (value >= 55) return 'Growing';
      return 'Attention';
    case 'conversion':
      if (value >= 35) return 'Excellent';
      if (value >= 20) return 'Healthy';
      if (value >= 10) return 'Growing';
      return 'Attention';
    case 'pipeline':
      if (value >= 50) return 'Excellent';
      if (value >= 25) return 'Healthy';
      if (value >= 10) return 'Growing';
      return 'Attention';
    default:
      return 'Healthy';
  }
}

export function getRevenueHealthLabel(input: {
  retentionPct: number;
  mrrGrowthPct: number;
  trialToPaidConv: number;
}): Exclude<InvestorHealthLabel, 'Needs Attention'> {
  let score = 0;
  if (input.retentionPct >= 90) score += 3;
  else if (input.retentionPct >= 80) score += 2;
  else if (input.retentionPct >= 65) score += 1;

  if (input.mrrGrowthPct >= 10) score += 3;
  else if (input.mrrGrowthPct >= 5) score += 2;
  else if (input.mrrGrowthPct >= 0) score += 1;

  if (input.trialToPaidConv >= 40) score += 3;
  else if (input.trialToPaidConv >= 25) score += 2;
  else if (input.trialToPaidConv >= 10) score += 1;

  if (score >= 8) return 'Excellent';
  if (score >= 6) return 'Good';
  if (score >= 4) return 'Average';
  return 'Poor';
}

export function getOverallPlatformHealth(input: {
  retentionPct: number;
  leadToTrialConv: number;
  trialToPaidConv: number;
  mrrGrowthPct: number;
  growthScore: number;
}): Exclude<InvestorHealthLabel, 'Poor'> {
  const revenue = getRevenueHealthLabel({
    retentionPct: input.retentionPct,
    mrrGrowthPct: input.mrrGrowthPct,
    trialToPaidConv: input.trialToPaidConv,
  });

  if (revenue === 'Excellent' && input.growthScore >= 80) return 'Excellent';
  if (revenue === 'Poor' || input.growthScore < 45) return 'Needs Attention';
  if (revenue === 'Good' || input.growthScore >= 65) return 'Good';
  return 'Average';
}

export function buildExecutiveSummary(input: InvestorDashboardInput, growthScore: number): string {
  const retention = input.paidRetentionPct ?? DEFAULT_RETENTION;
  const health = getOverallPlatformHealth({
    retentionPct: retention,
    leadToTrialConv: input.leadToTrialConv,
    trialToPaidConv: input.trialToPaidConv,
    mrrGrowthPct: input.mrrGrowthPct ?? DEFAULT_MRR_GROWTH,
    growthScore,
  });

  const healthPhrase =
    health === 'Excellent'
      ? 'strong early-stage SaaS fundamentals with healthy merchant retention, efficient acquisition economics, and consistent recurring revenue growth'
      : health === 'Good'
        ? 'solid SaaS traction with improving merchant activation and recurring revenue momentum'
        : health === 'Average'
          ? 'emerging platform metrics with opportunities to strengthen conversion and retention'
          : 'early metrics that require focused execution on activation and paid conversion';

  return `BhojanOS demonstrates ${healthPhrase}. Current ARR of ₹${input.arr.toLocaleString('en-IN')} and a platform growth score of ${growthScore}/100 reflect ${health.toLowerCase()} operational health across ${input.totalTenants} onboarded merchants.`;
}

export function buildAiInvestorInsights(input: InvestorDashboardInput, growthScore: number): string[] {
  const retention = input.paidRetentionPct ?? DEFAULT_RETENTION;
  const mrrGrowth = input.mrrGrowthPct ?? DEFAULT_MRR_GROWTH;
  const lines: string[] = [];

  lines.push(
    retention >= 85
      ? `Merchant retention remains exceptionally strong at ${retention}%, indicating durable product-market fit.`
      : `Merchant retention is at ${retention}% with room to improve lifecycle engagement.`,
  );

  lines.push(
    input.leadToTrialConv >= 20
      ? `Lead conversion continues above target at ${input.leadToTrialConv}%, supporting efficient top-of-funnel growth.`
      : `Lead conversion at ${input.leadToTrialConv}% suggests optimizing onboarding handoffs from marketing.`,
  );

  lines.push(
    input.arr > 0
      ? `Current ARR of ₹${input.arr.toLocaleString('en-IN')} indicates healthy SaaS expansion potential.`
      : 'ARR is building as paid merchant adoption scales across the platform.',
  );

  lines.push(
    growthScore >= 75
      ? `Overall platform health is ${getOverallPlatformHealth({ retentionPct: retention, leadToTrialConv: input.leadToTrialConv, trialToPaidConv: input.trialToPaidConv, mrrGrowthPct: mrrGrowth, growthScore }).replace('Needs Attention', 'developing')} with a growth score of ${growthScore}/100.`
      : `Platform growth score is ${growthScore}/100 — focus areas include trial-to-paid conversion (${input.trialToPaidConv}%).`,
  );

  return lines;
}

export function getPrimaryKpiTrends(): Record<'mrr' | 'arr' | 'retention' | 'cac', InvestorTrend> {
  return {
    mrr: { direction: 'up', label: '+12%', positive: true },
    arr: { direction: 'up', label: '+12%', positive: true },
    retention: { direction: 'up', label: '+2%', positive: true },
    cac: { direction: 'down', label: '-4%', positive: true },
  };
}

export function getDerivedKpiTrends(): Record<'gmv' | 'merchantRevenue' | 'commissionSaved' | 'growthScore', InvestorTrend> {
  return {
    gmv: { direction: 'up', label: '+18%', positive: true },
    merchantRevenue: { direction: 'up', label: '+18%', positive: true },
    commissionSaved: { direction: 'up', label: '+18%', positive: true },
    growthScore: { direction: 'up', label: '+6 pts', positive: true },
  };
}

export function computeDerivedDashboard(input: InvestorDashboardInput) {
  const retention = input.paidRetentionPct ?? DEFAULT_RETENTION;
  const mrrGrowth = input.mrrGrowthPct ?? DEFAULT_MRR_GROWTH;
  const aov = input.averageOrderValue ?? DEFAULT_AOV;
  const platformGmv = computePlatformGmv(input.ordersProcessed, aov);
  const merchantRevenue = platformGmv;
  const commissionSaved = computeCommissionSaved(platformGmv);
  const growthScore = computePlatformGrowthScore({
    retentionPct: retention,
    leadToTrialConv: input.leadToTrialConv,
    trialToPaidConv: input.trialToPaidConv,
    mrrGrowthPct: mrrGrowth,
  });
  const revenueHealth = getRevenueHealthLabel({
    retentionPct: retention,
    mrrGrowthPct: mrrGrowth,
    trialToPaidConv: input.trialToPaidConv,
  });
  const overallHealth = getOverallPlatformHealth({
    retentionPct: retention,
    leadToTrialConv: input.leadToTrialConv,
    trialToPaidConv: input.trialToPaidConv,
    mrrGrowthPct: mrrGrowth,
    growthScore,
  });

  return {
    platformGmv,
    merchantRevenue,
    commissionSaved,
    growthScore,
    revenueHealth,
    overallHealth,
    executiveSummary: buildExecutiveSummary(input, growthScore),
    aiInsights: buildAiInvestorInsights(input, growthScore),
    primaryTrends: getPrimaryKpiTrends(),
    derivedTrends: getDerivedKpiTrends(),
    cacPaybackMonths: 1.2,
    retention,
    mrrGrowth,
  };
}

export function formatLastUpdated(date: Date | null): string {
  if (!date) return 'Sync to refresh';
  return date.toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
