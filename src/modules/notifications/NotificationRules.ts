import {
  NotificationCategory,
  NotificationCreateInput,
  NotificationPriority,
  NotificationRuleContext,
} from './NotificationTypes';

const formatCurrency = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

type RuleEvaluator = (ctx: NotificationRuleContext) => NotificationCreateInput | null;

const ruleKey = (id: string) => id;

const makeNotification = (
  ctx: NotificationRuleContext,
  id: string,
  partial: Omit<NotificationCreateInput, 'tenantId'>
): NotificationCreateInput | null => {
  if (ctx.existingRuleKeys.has(ruleKey(id))) return null;
  return { tenantId: ctx.snapshot.tenantId, ...partial, metadata: { ...partial.metadata, ruleId: id } };
};

const REVENUE_MILESTONES = [10000, 50000, 100000, 500000];

export const NOTIFICATION_RULES: Array<{ id: string; evaluate: RuleEvaluator }> = [
  {
    id: 'revenue_milestones',
    evaluate: (ctx) => {
      const total = ctx.snapshot.totalRevenue;
      const crossed = REVENUE_MILESTONES.filter((m) => ctx.snapshot.milestonesCrossed.includes(m));
      const latest = crossed[crossed.length - 1];
      if (!latest) return null;
      return makeNotification(ctx, `revenue_${latest}`, {
        title: `Revenue milestone: ${formatCurrency(latest)}`,
        message: `Congratulations! Lifetime revenue crossed ${formatCurrency(latest)}. Keep the momentum going.`,
        type: 'revenue_milestone',
        priority: NotificationPriority.HIGH,
        category: NotificationCategory.SALES,
        sentVia: { in_app: true },
        actionUrl: '/owner/dashboard',
        expiresAt: null,
      });
    },
  },
  {
    id: 'no_orders_today',
    evaluate: (ctx) => {
      if (!ctx.snapshot.inactiveToday || !ctx.config.salesAlerts.enabled) return null;
      return makeNotification(ctx, 'no_orders_today', {
        title: 'No orders received today',
        message: 'Your kitchen has not received any orders yet today. Consider activating a flash offer or sharing your store link.',
        type: 'no_orders',
        priority: NotificationPriority.HIGH,
        category: NotificationCategory.SALES,
        sentVia: { in_app: true },
        actionUrl: '/owner/marketing',
        expiresAt: null,
      });
    },
  },
  {
    id: 'inventory_low',
    evaluate: (ctx) => {
      if (!ctx.config.inventoryAlerts.enabled || ctx.snapshot.lowStockItems.length === 0) return null;
      return makeNotification(ctx, 'inventory_low', {
        title: 'Inventory below threshold',
        message: `Low stock alert: ${ctx.snapshot.lowStockItems.slice(0, 5).join(', ')}. Restock to avoid order lockouts.`,
        type: 'inventory_low',
        priority: NotificationPriority.HIGH,
        category: NotificationCategory.INVENTORY,
        sentVia: { in_app: true },
        actionUrl: '/owner/recipes',
        expiresAt: null,
      });
    },
  },
  {
    id: 'inventory_critical',
    evaluate: (ctx) => {
      const critical = ctx.snapshot.inventoryItems.filter((i) => i.level === 'red');
      if (!ctx.config.inventoryAlerts.enabled || critical.length === 0) return null;
      const item = critical[0];
      return makeNotification(ctx, `inventory_critical_${item.name}`, {
        title: `${item.name} — critical stock`,
        message: item.message || `${item.name} will finish soon. Immediate restock recommended.`,
        type: 'inventory_critical',
        priority: NotificationPriority.CRITICAL,
        category: NotificationCategory.INVENTORY,
        sentVia: { in_app: true },
        actionUrl: '/owner/recipes',
        expiresAt: null,
      });
    },
  },
  {
    id: 'prep_time_increase',
    evaluate: (ctx) => {
      if (ctx.snapshot.avgPrepTimeMinutes <= 30) return null;
      return makeNotification(ctx, 'prep_time_increase', {
        title: 'Preparation time increasing',
        message: `Average prep time is ${Math.round(ctx.snapshot.avgPrepTimeMinutes)} minutes. Review kitchen workflow to reduce delays.`,
        type: 'prep_time',
        priority: NotificationPriority.MEDIUM,
        category: NotificationCategory.KITCHEN,
        sentVia: { in_app: true },
        actionUrl: '/owner/orders',
        expiresAt: null,
      });
    },
  },
  {
    id: 'delayed_orders',
    evaluate: (ctx) => {
      if (ctx.snapshot.delayedOrders === 0) return null;
      return makeNotification(ctx, 'delayed_orders', {
        title: `${ctx.snapshot.delayedOrders} delayed order${ctx.snapshot.delayedOrders === 1 ? '' : 's'}`,
        message: 'Some orders are taking longer than expected. Check the Commerce Engine queue.',
        type: 'delayed_orders',
        priority: NotificationPriority.HIGH,
        category: NotificationCategory.KITCHEN,
        sentVia: { in_app: true },
        actionUrl: '/owner/orders',
        expiresAt: null,
      });
    },
  },
  {
    id: 'top_selling_item',
    evaluate: (ctx) => {
      if (!ctx.snapshot.topSellingItem || ctx.snapshot.topSellingItem === 'N/A') return null;
      return makeNotification(ctx, 'top_selling_item', {
        title: `Top seller: ${ctx.snapshot.topSellingItem}`,
        message: `${ctx.snapshot.topSellingItem} is your best performer. Ensure adequate stock and consider featuring it in campaigns.`,
        type: 'top_seller',
        priority: NotificationPriority.LOW,
        category: NotificationCategory.SALES,
        sentVia: { in_app: true },
        actionUrl: '/owner/menu',
        expiresAt: null,
      });
    },
  },
  {
    id: 'repeat_customer_milestone',
    evaluate: (ctx) => {
      if (ctx.snapshot.repeatCustomers < 10) return null;
      const milestone = Math.floor(ctx.snapshot.repeatCustomers / 10) * 10;
      return makeNotification(ctx, `repeat_milestone_${milestone}`, {
        title: `${milestone}+ repeat customers`,
        message: `You have ${ctx.snapshot.repeatCustomers} repeat customers. Loyalty is building — consider a VIP reward.`,
        type: 'repeat_milestone',
        priority: NotificationPriority.MEDIUM,
        category: NotificationCategory.CUSTOMERS,
        sentVia: { in_app: true },
        actionUrl: '/owner/customers',
        expiresAt: null,
      });
    },
  },
  {
    id: 'low_rating',
    evaluate: (ctx) => {
      if (!ctx.snapshot.lowRating) return null;
      return makeNotification(ctx, 'low_rating', {
        title: 'Customer satisfaction alert',
        message: 'Recent ratings are below target. Review feedback and address quality issues promptly.',
        type: 'low_rating',
        priority: NotificationPriority.HIGH,
        category: NotificationCategory.CUSTOMERS,
        sentVia: { in_app: true },
        actionUrl: '/owner/feedback',
        expiresAt: null,
      });
    },
  },
  {
    id: 'payment_settled',
    evaluate: (ctx) => {
      if (!ctx.snapshot.paymentSettled) return null;
      return makeNotification(ctx, 'payment_settled', {
        title: 'Payment settled',
        message: 'Your latest payout has been processed successfully.',
        type: 'payment_settled',
        priority: NotificationPriority.MEDIUM,
        category: NotificationCategory.PAYMENTS,
        sentVia: { in_app: true },
        actionUrl: '/owner/subscription',
        expiresAt: null,
      });
    },
  },
  {
    id: 'store_inactive',
    evaluate: (ctx) => {
      if (!ctx.snapshot.storeInactive) return null;
      return makeNotification(ctx, 'store_inactive', {
        title: 'Store is offline',
        message: 'Your storefront is currently closed. Customers cannot place orders until you go live.',
        type: 'store_inactive',
        priority: NotificationPriority.CRITICAL,
        category: NotificationCategory.SYSTEM,
        sentVia: { in_app: true },
        actionUrl: '/owner/settings?tab=hours',
        expiresAt: null,
      });
    },
  },
  {
    id: 'demand_spike',
    evaluate: (ctx) => {
      if (!ctx.snapshot.demandPrediction.includes('spike') && !ctx.snapshot.demandPrediction.includes('high')) return null;
      return makeNotification(ctx, 'demand_spike', {
        title: 'Demand spike predicted',
        message: ctx.snapshot.demandPrediction,
        type: 'demand_spike',
        priority: NotificationPriority.HIGH,
        category: NotificationCategory.AI_RECOMMENDATION,
        sentVia: { in_app: true },
        actionUrl: '/owner/operations',
        expiresAt: null,
      });
    },
  },
  {
    id: 'festival_recommendation',
    evaluate: (ctx) => {
      const month = new Date().getMonth();
      const festivals: Record<number, string> = {
        9: 'Diwali',
        10: 'Diwali season',
        2: 'Holi',
        7: 'Independence Day weekend',
      };
      const festival = festivals[month];
      if (!festival || !ctx.config.marketingAlerts.enabled) return null;
      return makeNotification(ctx, `festival_${month}`, {
        title: `${festival} campaign opportunity`,
        message: `Launch a festive combo or limited-time offer for ${festival} to capture seasonal demand.`,
        type: 'festival_recommendation',
        priority: NotificationPriority.MEDIUM,
        category: NotificationCategory.MARKETING,
        sentVia: { in_app: true },
        actionUrl: '/owner/marketing',
        expiresAt: null,
      });
    },
  },
  {
    id: 'ai_restock',
    evaluate: (ctx) => {
      const critical = ctx.snapshot.inventoryItems.find((i) => i.level === 'red' || i.level === 'yellow');
      if (!critical) return null;
      return makeNotification(ctx, `ai_restock_${critical.name}`, {
        title: `Restock ${critical.name}`,
        message: `AI suggests restocking ${critical.name}. ${critical.message}`,
        type: 'ai_restock',
        priority: NotificationPriority.MEDIUM,
        category: NotificationCategory.AI_RECOMMENDATION,
        sentVia: { in_app: true },
        metadata: { expectedGain: Math.round(ctx.snapshot.yesterdayRevenue * 0.15) },
        actionUrl: '/owner/recipes',
        expiresAt: null,
      });
    },
  },
  {
    id: 'slow_moving_item',
    evaluate: (ctx) => {
      if (!ctx.snapshot.slowMovingItem || ctx.snapshot.slowMovingItem === 'N/A') return null;
      return makeNotification(ctx, 'slow_moving_item', {
        title: `Slow mover: ${ctx.snapshot.slowMovingItem}`,
        message: `Consider a discount combo or bundle featuring ${ctx.snapshot.slowMovingItem} to improve turnover.`,
        type: 'slow_moving',
        priority: NotificationPriority.LOW,
        category: NotificationCategory.MARKETING,
        sentVia: { in_app: true },
        actionUrl: '/owner/marketing',
        expiresAt: null,
      });
    },
  },
  {
    id: 'revenue_growth',
    evaluate: (ctx) => {
      if (ctx.snapshot.revenueGrowthPct <= 5) return null;
      return makeNotification(ctx, 'revenue_growth', {
        title: `Revenue up ${Math.round(ctx.snapshot.revenueGrowthPct)}%`,
        message: 'Your revenue is growing compared to the previous period. Double down on what is working.',
        type: 'revenue_growth',
        priority: NotificationPriority.MEDIUM,
        category: NotificationCategory.SALES,
        sentVia: { in_app: true },
        actionUrl: '/owner/dashboard',
        expiresAt: null,
      });
    },
  },
];

export const evaluateNotificationRules = (ctx: NotificationRuleContext): NotificationCreateInput[] => {
  const results: NotificationCreateInput[] = [];
  for (const rule of NOTIFICATION_RULES) {
    const notification = rule.evaluate(ctx);
    if (notification) results.push(notification);
  }
  return results;
};
