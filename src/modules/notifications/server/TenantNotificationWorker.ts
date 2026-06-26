import {
  InventoryStatusItem,
  ScheduledJobType,
  TenantBusinessSnapshot,
  TenantNotificationConfig,
  DEFAULT_NOTIFICATION_CONFIG,
} from '../NotificationTypes';
import { notificationEngine } from '../NotificationEngine';
import { buildDailyBriefWhatsApp, snapshotToDailyBriefMetrics } from '../NotificationTemplates';
import { shouldRunJobForTenant } from '../NotificationScheduler';

import type { Firestore } from 'firebase-admin/firestore';

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const isYesterday = (d: Date, now: Date) => {
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  return isSameDay(d, y);
};

export async function buildTenantBusinessSnapshot(
  db: Firestore,
  tenantId: string
): Promise<TenantBusinessSnapshot | null> {
  const tenantSnap = await db.collection('tenants').doc(tenantId).get();
  if (!tenantSnap.exists) return null;

  const tenant = tenantSnap.data() || {};
  const now = new Date();
  const todayStart = startOfDay(now);

  const ordersSnap = await db.collection('orders').where('tenantId', '==', tenantId).get();
  const orders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const validOrders = orders.filter(
    (o: any) => o.status !== 'CANCELLED' && o.status !== 'EXPIRED' && o.status !== 'FAILED_DELIVERY'
  );

  let yesterdayRevenue = 0;
  let yesterdayOrders = 0;
  let todayOrders = 0;
  let totalRevenue = 0;
  let delayedOrders = 0;
  let prepTimeSum = 0;
  let prepTimeCount = 0;
  const itemCounts = new Map<string, number>();
  const hourCounts = new Map<number, number>();
  const customers = new Set<string>();
  const repeatCustomers = new Set<string>();
  const customerSeen = new Set<string>();

  validOrders.forEach((order: any) => {
    const created = toDate(order.createdAt);
    const amount = Number(order.totalAmount || 0);
    totalRevenue += amount;

    if (created) {
      if (isYesterday(created, now)) {
        yesterdayRevenue += amount;
        yesterdayOrders += 1;
      }
      if (created >= todayStart) {
        todayOrders += 1;
      }
      const hour = created.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }

    const customerKey = order.userId || order.phone || order.customerDetails?.phone;
    if (customerKey) {
      if (customerSeen.has(customerKey)) repeatCustomers.add(customerKey);
      else customerSeen.add(customerKey);
      customers.add(customerKey);
    }

    if (order.prepTimeMinutes) {
      prepTimeSum += Number(order.prepTimeMinutes);
      prepTimeCount += 1;
    }
    if (order.status === 'DELAYED' || order.isDelayed) delayedOrders += 1;

    (order.items || []).forEach((item: any) => {
      const name = item.name || 'Unknown';
      itemCounts.set(name, (itemCounts.get(name) || 0) + (item.quantity || 1));
    });
  });

  const sortedItems = [...itemCounts.entries()].sort((a, b) => b[1] - a[1]);
  const topSellingItem = sortedItems[0]?.[0] || 'N/A';
  const lowestSellingItem = sortedItems[sortedItems.length - 1]?.[0] || 'N/A';
  const slowMovingItem = sortedItems.filter(([, c]) => c <= 2).pop()?.[0] || lowestSellingItem;

  let bestSellingHour = 12;
  let peakTrafficHour = 12;
  let maxHourCount = 0;
  hourCounts.forEach((count, hour) => {
    if (count > maxHourCount) {
      maxHourCount = count;
      bestSellingHour = hour;
      peakTrafficHour = hour;
    }
  });

  const menuSnap = await db.collection('menu').where('tenantId', '==', tenantId).get();
  const menuItems = menuSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const inventoryItems: InventoryStatusItem[] = [];
  const lowStockItems: string[] = [];

  menuItems.forEach((item: any) => {
    const stock = item.stockCount;
    const threshold = item.lowStockThreshold ?? 10;
    if (stock === undefined || stock === null) return;

    if (stock <= 0) {
      inventoryItems.push({ name: item.name, level: 'red', message: 'Out of stock' });
      lowStockItems.push(item.name);
    } else if (stock <= threshold) {
      inventoryItems.push({
        name: item.name,
        level: 'yellow',
        message: `Only ${stock} left`,
        daysRemaining: Math.max(1, Math.floor(stock / 3)),
      });
      lowStockItems.push(item.name);
    } else {
      inventoryItems.push({ name: item.name, level: 'green', message: 'Healthy' });
    }
  });

  if (inventoryItems.length === 0) {
    ['Rice', 'Oil', 'Paneer', 'Chicken'].forEach((name, i) => {
      const levels: Array<'green' | 'yellow' | 'red'> = ['green', 'yellow', 'yellow', 'green'];
      inventoryItems.push({ name, level: levels[i], message: levels[i] === 'yellow' ? 'Monitor levels' : 'Healthy' });
    });
  }

  const analyticsSnap = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('analytics')
    .doc('overview')
    .get();
  const analytics = analyticsSnap.exists ? analyticsSnap.data() : {};

  const currentMonthRev = Number(analytics?.currentMonth?.revenue || yesterdayRevenue * 30);
  const previousMonthRev = Number(analytics?.previousMonth?.revenue || currentMonthRev);
  const revenueGrowthPct =
    previousMonthRev > 0 ? ((currentMonthRev - previousMonthRev) / previousMonthRev) * 100 : 0;

  const avgOrderValue = yesterdayOrders > 0 ? Math.round(yesterdayRevenue / yesterdayOrders) : 0;
  const profitEstimate = Math.round(yesterdayRevenue * 0.45);
  const commissionSaved = Math.round(yesterdayRevenue * 0.14);

  const businessHealthScore = Math.min(
    100,
    Math.round(
      (Math.min(yesterdayOrders, 50) / 50) * 30 +
        (Math.min(yesterdayRevenue, 50000) / 50000) * 25 +
        (Math.min(repeatCustomers.size, 30) / 30) * 20 +
        (tenant.kyc?.emailVerificationStatus === 'verified' ? 15 : 5) +
        (inventoryItems.filter((i) => i.level === 'red').length === 0 ? 10 : 0)
    )
  );

  const avgPrepTime = prepTimeCount > 0 ? prepTimeSum / prepTimeCount : Number(tenant.deliveryConfig?.prepTime || 20);
  const kitchenHealthScore = Math.max(0, Math.min(100, Math.round(100 - (avgPrepTime - 15) * 2 - delayedOrders * 5)));
  const growthScore = Math.max(0, Math.min(100, Math.round(50 + revenueGrowthPct)));

  const milestonesCrossed = [10000, 50000, 100000, 500000].filter((m) => totalRevenue >= m);

  const demandPrediction =
    todayOrders > yesterdayOrders
      ? 'Demand spike predicted for today based on early order velocity.'
      : `Expected ${Math.max(10, Math.round(yesterdayOrders * 1.05))} orders today based on historical patterns.`;

  const aiSuggestions: string[] = [];
  if (lowStockItems.length > 0) aiSuggestions.push(`Restock ${lowStockItems[0]} to avoid lost sales.`);
  if (avgPrepTime > 25) aiSuggestions.push('Reduce prep time by optimizing kitchen workflow.');
  if (revenueGrowthPct < 0) aiSuggestions.push('Launch a win-back campaign for inactive customers.');
  if (aiSuggestions.length === 0) aiSuggestions.push('Business is stable. Review Command Center for growth opportunities.');

  return {
    tenantId,
    tenantName: tenant.name || tenantId,
    storeStatus: tenant.storeStatus || tenant.storeOperations?.manualStatus,
    yesterdayRevenue,
    yesterdayOrders,
    todayOrders,
    totalRevenue,
    averageOrderValue: avgOrderValue,
    repeatCustomers: repeatCustomers.size,
    topSellingItem,
    lowestSellingItem,
    fastestGrowingItem: topSellingItem,
    slowMovingItem,
    bestSellingHour,
    peakTrafficHour,
    revenueGrowthPct,
    avgPrepTimeMinutes: avgPrepTime,
    delayedOrders,
    kitchenHealthScore,
    businessHealthScore,
    growthScore,
    inventoryItems,
    aiSuggestions,
    demandPrediction,
    profitEstimate,
    commissionSaved,
    milestonesCrossed,
    lowStockItems,
    inactiveToday: todayOrders === 0 && now.getHours() >= 11,
    newReviews: 0,
    lowRating: false,
    paymentSettled: false,
    storeInactive: tenant.storeStatus === 'closed' || tenant.storeOperations?.manualStatus === 'closed',
  };
}

export async function processTenantNotifications(
  db: Firestore,
  tenantId: string,
  jobType: ScheduledJobType,
  sendWhatsApp: (to: string, message: string) => Promise<void>,
  storefrontBaseUrl: string
): Promise<number> {
  const tenantSnap = await db.collection('tenants').doc(tenantId).get();
  if (!tenantSnap.exists) return 0;

  const tenant = tenantSnap.data() || {};
  const config: TenantNotificationConfig = {
    ...DEFAULT_NOTIFICATION_CONFIG,
    ...(tenant.notificationConfig || {}),
    ownerPhone: tenant.contact?.whatsapp,
    ownerEmail: tenant.ownerEmail,
  };

  if (!shouldRunJobForTenant(jobType, config)) return 0;

  const snapshot = await buildTenantBusinessSnapshot(db, tenantId);
  if (!snapshot) return 0;

  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const existingSnap = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('notifications')
    .orderBy('createdAt', 'desc')
    .limit(200)
    .get();

  const existingRuleKeys = new Set<string>();
  existingSnap.docs.forEach((d) => {
    const data = d.data();
    if (String(data?.createdAt || '') < sinceIso) return;
    const ruleId = data?.metadata?.ruleId;
    if (ruleId) existingRuleKeys.add(String(ruleId));
  });

  const notifications = notificationEngine.runFullAnalysis(
    snapshot,
    config,
    existingRuleKeys,
    jobType === 'critical_scan' ? undefined : jobType
  );

  if (notifications.length === 0) return 0;

  const batch = db.batch();
  const now = new Date().toISOString();

  notifications.forEach((input) => {
    const ref = db.collection('tenants').doc(tenantId).collection('notifications').doc();
    batch.set(ref, {
      id: ref.id,
      tenantId,
      title: input.title,
      message: input.message,
      type: input.type,
      priority: input.priority,
      category: input.category,
      status: 'UNREAD',
      createdAt: now,
      readAt: null,
      sentVia: input.sentVia,
      metadata: input.metadata || {},
      actionUrl: input.actionUrl,
      expiresAt: input.expiresAt ?? null,
    });
  });

  await batch.commit();

  const analyticsRef = db.collection('tenants').doc(tenantId).collection('notification_analytics').doc('summary');
  await analyticsRef.set(
    { sent: (existingSnap.size || 0) + notifications.length, lastUpdated: now },
    { merge: true }
  );

  if (
    config.whatsappEnabled &&
    config.ownerPhone &&
    ['morning_brief', 'evening_report', 'weekly_report', 'monthly_report'].includes(jobType)
  ) {
    const metrics = snapshotToDailyBriefMetrics(snapshot);
    const slug = tenant.slug || tenantId;
    const message = buildDailyBriefWhatsApp(
      snapshot.tenantName,
      metrics,
      `${storefrontBaseUrl}/owner/dashboard`
    );
    await sendWhatsApp(config.ownerPhone, message).catch(() => {});
  }

  const critical = notifications.filter((n) => n.priority === 'CRITICAL');
  if (config.whatsappEnabled && config.ownerPhone && critical.length > 0) {
    for (const n of critical.slice(0, 3)) {
      await sendWhatsApp(
        config.ownerPhone,
        `🚨 ${n.title}\n\n${n.message}\n\n${storefrontBaseUrl}${n.actionUrl || '/owner/dashboard'}`
      ).catch(() => {});
    }
  }

  return notifications.length;
}

export async function processAllTenants(
  db: Firestore,
  jobType: ScheduledJobType,
  sendWhatsApp: (to: string, message: string) => Promise<void>,
  storefrontBaseUrl: string
): Promise<{ processed: number; notifications: number }> {
  const tenantsSnap = await db.collection('tenants').where('status', '==', 'active').get();
  let notifications = 0;
  let processed = 0;

  for (const docSnap of tenantsSnap.docs) {
    const count = await processTenantNotifications(db, docSnap.id, jobType, sendWhatsApp, storefrontBaseUrl);
    if (count > 0) processed += 1;
    notifications += count;
  }

  if (tenantsSnap.empty) {
    const allTenants = await db.collection('tenants').limit(50).get();
    for (const docSnap of allTenants.docs) {
      const count = await processTenantNotifications(db, docSnap.id, jobType, sendWhatsApp, storefrontBaseUrl);
      if (count > 0) processed += 1;
      notifications += count;
    }
  }

  return { processed, notifications };
}
