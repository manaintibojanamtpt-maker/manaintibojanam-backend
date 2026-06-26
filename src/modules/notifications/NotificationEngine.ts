import { evaluateNotificationRules } from './NotificationRules';
import {
  buildDailyBriefInApp,
  buildRecommendationCard,
  snapshotToDailyBriefMetrics,
} from './NotificationTemplates';
import {
  NotificationCreateInput,
  NotificationRuleContext,
  ScheduledJobType,
  TenantBusinessSnapshot,
  TenantNotificationConfig,
} from './NotificationTypes';

export class NotificationEngine {
  generateFromRules(
    snapshot: TenantBusinessSnapshot,
    config: TenantNotificationConfig,
    existingRuleKeys: Set<string>
  ): NotificationCreateInput[] {
    const ctx: NotificationRuleContext = { snapshot, config, existingRuleKeys };
    return evaluateNotificationRules(ctx);
  }

  generateDailyBrief(
    snapshot: TenantBusinessSnapshot,
    jobType: ScheduledJobType
  ): NotificationCreateInput {
    const metrics = snapshotToDailyBriefMetrics(snapshot);
    return buildDailyBriefInApp(snapshot.tenantId, jobType, metrics);
  }

  generateAiRecommendations(snapshot: TenantBusinessSnapshot): NotificationCreateInput[] {
    const recommendations: NotificationCreateInput[] = [];

    if (snapshot.avgPrepTimeMinutes > 25) {
      recommendations.push(
        buildRecommendationCard(
          snapshot.tenantId,
          'Reduce preparation time',
          `Average prep is ${Math.round(snapshot.avgPrepTimeMinutes)} min. Streamline prep stations to improve kitchen health.`,
          Math.round(snapshot.yesterdayRevenue * 0.08),
          '/owner/orders'
        )
      );
    }

    if (snapshot.lowStockItems.length > 0) {
      recommendations.push(
        buildRecommendationCard(
          snapshot.tenantId,
          'Increase stock',
          `Restock ${snapshot.lowStockItems[0]} to prevent lost sales during peak hours.`,
          Math.round(snapshot.averageOrderValue * 12),
          '/owner/recipes'
        )
      );
    }

    if (snapshot.slowMovingItem && snapshot.slowMovingItem !== 'N/A') {
      recommendations.push(
        buildRecommendationCard(
          snapshot.tenantId,
          'Launch combo offer',
          `Bundle ${snapshot.slowMovingItem} with ${snapshot.topSellingItem} to increase AOV.`,
          Math.round(snapshot.averageOrderValue * 8),
          '/owner/marketing'
        )
      );
    }

    if (snapshot.revenueGrowthPct < 0) {
      recommendations.push(
        buildRecommendationCard(
          snapshot.tenantId,
          'Offer targeted discount',
          'Revenue is trending down. A win-back discount for inactive customers could recover sales.',
          Math.round(Math.abs(snapshot.revenueGrowthPct) * 100),
          '/owner/marketing'
        )
      );
    }

    if (snapshot.bestSellingHour >= 0) {
      recommendations.push(
        buildRecommendationCard(
          snapshot.tenantId,
          'Add trending menu item',
          `Peak orders arrive around ${snapshot.bestSellingHour}:00. Feature a limited-time special for that window.`,
          Math.round(snapshot.averageOrderValue * 15),
          '/owner/menu'
        )
      );
    }

    return recommendations.slice(0, 5);
  }

  runFullAnalysis(
    snapshot: TenantBusinessSnapshot,
    config: TenantNotificationConfig,
    existingRuleKeys: Set<string>,
    jobType?: ScheduledJobType
  ): NotificationCreateInput[] {
    const notifications: NotificationCreateInput[] = [];

    if (jobType) {
      notifications.push(this.generateDailyBrief(snapshot, jobType));
    }

    notifications.push(...this.generateFromRules(snapshot, config, existingRuleKeys));
    notifications.push(...this.generateAiRecommendations(snapshot));

    const seen = new Set<string>();
    return notifications.filter((n) => {
      const key = `${n.type}:${n.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

export const notificationEngine = new NotificationEngine();
