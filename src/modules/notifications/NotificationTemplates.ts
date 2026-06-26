import {
  DailyBriefMetrics,
  NotificationCategory,
  NotificationCreateInput,
  NotificationPriority,
  ScheduledJobType,
  TenantBusinessSnapshot,
} from './NotificationTypes';

const formatCurrency = (amount: number) =>
  `₹${Math.round(amount).toLocaleString('en-IN')}`;

const inventoryEmoji = (level: 'green' | 'yellow' | 'red') => {
  if (level === 'green') return '🟢';
  if (level === 'yellow') return '🟡';
  return '🔴';
};

export const buildDailyBriefWhatsApp = (
  tenantName: string,
  metrics: DailyBriefMetrics,
  commandCenterUrl: string
): string => {
  const inventoryLines = metrics.inventoryStatus
    .slice(0, 5)
    .map((item) => `${inventoryEmoji(item.level)} ${item.name}${item.message ? ` — ${item.message}` : ''}`)
    .join('\n');

  const suggestion = metrics.aiSuggestions[0] || 'Review your Command Center for personalized insights.';
  const expectedGain = metrics.aiSuggestions.length > 0
    ? formatCurrency(Math.round(metrics.revenue * 0.17))
    : formatCurrency(0);

  return [
    '🌅 Good Morning!',
    '',
    `BhojanOS Daily Intelligence — ${tenantName}`,
    '',
    'Revenue',
    formatCurrency(metrics.revenue),
    '',
    'Orders',
    String(metrics.orders),
    '',
    'Profit',
    formatCurrency(metrics.profit),
    '',
    'Commission Saved',
    formatCurrency(metrics.commissionSaved),
    '',
    'Top Item',
    metrics.topSellingItem,
    '',
    'Inventory',
    inventoryLines || '🟢 All items healthy',
    '',
    'AI Suggestion',
    suggestion,
    '',
    'Expected revenue gain',
    expectedGain,
    '',
    'Open Command Center',
    commandCenterUrl,
  ].join('\n');
};

export const buildDailyBriefInApp = (
  tenantId: string,
  jobType: ScheduledJobType,
  metrics: DailyBriefMetrics
): NotificationCreateInput => {
  const titles: Record<ScheduledJobType, string> = {
    morning_brief: 'Good Morning — Daily Intelligence Brief',
    afternoon_brief: 'Afternoon Business Pulse',
    evening_report: 'Evening Performance Report',
    weekly_report: 'Weekly Business Summary',
    monthly_report: 'Monthly Performance Report',
    critical_scan: 'Critical Alert Scan',
  };

  const lowStock = metrics.itemsRunningLow.length
    ? `Items running low: ${metrics.itemsRunningLow.join(', ')}.`
    : 'Inventory levels look healthy.';

  return {
    tenantId,
    title: titles[jobType] || 'Business Brief',
    message: [
      `Revenue ${formatCurrency(metrics.revenue)} · ${metrics.orders} orders · AOV ${formatCurrency(metrics.averageOrderValue)}.`,
      `Top seller: ${metrics.topSellingItem}. ${lowStock}`,
      `Business Health ${metrics.businessHealthScore}/100 · Kitchen ${metrics.kitchenHealthScore}/100 · Growth ${metrics.growthScore}/100.`,
      metrics.demandPrediction,
    ].join(' '),
    type: jobType,
    priority: NotificationPriority.MEDIUM,
    category: NotificationCategory.AI_RECOMMENDATION,
    sentVia: { in_app: true },
    metadata: { ...metrics, jobType },
    actionUrl: '/owner/dashboard',
    expiresAt: null,
  };
};

export const snapshotToDailyBriefMetrics = (snapshot: TenantBusinessSnapshot): DailyBriefMetrics => ({
  revenue: snapshot.yesterdayRevenue,
  orders: snapshot.yesterdayOrders,
  averageOrderValue: snapshot.averageOrderValue,
  profit: snapshot.profitEstimate,
  commissionSaved: snapshot.commissionSaved,
  topSellingItem: snapshot.topSellingItem,
  lowestSellingItem: snapshot.lowestSellingItem,
  repeatCustomers: snapshot.repeatCustomers,
  inventoryStatus: snapshot.inventoryItems,
  itemsRunningLow: snapshot.lowStockItems,
  demandPrediction: snapshot.demandPrediction,
  aiSuggestions: snapshot.aiSuggestions,
  businessHealthScore: snapshot.businessHealthScore,
  kitchenHealthScore: snapshot.kitchenHealthScore,
  growthScore: snapshot.growthScore,
});

export const buildCriticalAlertWhatsApp = (title: string, message: string, actionUrl: string): string =>
  [`🚨 ${title}`, '', message, '', actionUrl].join('\n');

export const buildRecommendationCard = (
  tenantId: string,
  title: string,
  message: string,
  potentialGain: number,
  actionUrl: string
): NotificationCreateInput => ({
  tenantId,
  title,
  message,
  type: 'ai_recommendation',
  priority: NotificationPriority.MEDIUM,
  category: NotificationCategory.AI_RECOMMENDATION,
  sentVia: { in_app: true },
  metadata: { potentialGain },
  actionUrl,
  expiresAt: null,
});
