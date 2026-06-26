export enum NotificationCategory {
  SALES = 'SALES',
  INVENTORY = 'INVENTORY',
  CUSTOMERS = 'CUSTOMERS',
  AI_RECOMMENDATION = 'AI_RECOMMENDATION',
  KITCHEN = 'KITCHEN',
  PAYMENTS = 'PAYMENTS',
  SYSTEM = 'SYSTEM',
  MARKETING = 'MARKETING',
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum NotificationStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED',
  FAILED = 'FAILED',
}

export type NotificationChannel = 'in_app' | 'whatsapp' | 'email' | 'push';

export interface NotificationSentVia {
  in_app?: boolean;
  whatsapp?: boolean;
  email?: boolean;
  push?: boolean;
}

export interface TenantNotification {
  id: string;
  tenantId: string;
  title: string;
  message: string;
  type: string;
  priority: NotificationPriority;
  category: NotificationCategory;
  status: NotificationStatus;
  createdAt: string;
  readAt?: string | null;
  sentVia: NotificationSentVia;
  metadata?: Record<string, unknown>;
  actionUrl?: string;
  expiresAt?: string | null;
}

export type NotificationCreateInput = Omit<TenantNotification, 'id' | 'createdAt' | 'status' | 'readAt'> & {
  status?: NotificationStatus;
};

export interface NotificationFilter {
  status?: NotificationStatus | 'ALL';
  category?: NotificationCategory | 'ALL';
  priority?: NotificationPriority | 'ALL';
  search?: string;
}

export interface NotificationAnalytics {
  sent: number;
  opened: number;
  read: number;
  clicked: number;
  failed: number;
  lastUpdated: string;
}

export interface BriefScheduleConfig {
  enabled: boolean;
  time: string;
  channels: NotificationChannel[];
}

export interface AlertChannelConfig {
  enabled: boolean;
  channels: NotificationChannel[];
}

export interface TenantNotificationConfig {
  morningBrief: BriefScheduleConfig;
  afternoonBrief: BriefScheduleConfig;
  eveningReport: BriefScheduleConfig;
  criticalAlerts: AlertChannelConfig;
  salesAlerts: AlertChannelConfig;
  inventoryAlerts: AlertChannelConfig;
  customerAlerts: AlertChannelConfig;
  marketingAlerts: AlertChannelConfig;
  whatsappEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  ownerPhone?: string;
  ownerEmail?: string;
}

export const DEFAULT_NOTIFICATION_CONFIG: TenantNotificationConfig = {
  morningBrief: { enabled: true, time: '08:00', channels: ['in_app', 'whatsapp'] },
  afternoonBrief: { enabled: false, time: '14:00', channels: ['in_app'] },
  eveningReport: { enabled: true, time: '20:00', channels: ['in_app', 'whatsapp'] },
  criticalAlerts: { enabled: true, channels: ['in_app', 'whatsapp', 'push'] },
  salesAlerts: { enabled: true, channels: ['in_app'] },
  inventoryAlerts: { enabled: true, channels: ['in_app', 'whatsapp'] },
  customerAlerts: { enabled: true, channels: ['in_app'] },
  marketingAlerts: { enabled: true, channels: ['in_app'] },
  whatsappEnabled: true,
  emailEnabled: false,
  pushEnabled: false,
};

export interface InventoryStatusItem {
  name: string;
  level: 'green' | 'yellow' | 'red';
  message: string;
  daysRemaining?: number;
}

export interface DailyBriefMetrics {
  revenue: number;
  orders: number;
  averageOrderValue: number;
  profit: number;
  commissionSaved: number;
  topSellingItem: string;
  lowestSellingItem: string;
  repeatCustomers: number;
  inventoryStatus: InventoryStatusItem[];
  itemsRunningLow: string[];
  demandPrediction: string;
  aiSuggestions: string[];
  businessHealthScore: number;
  kitchenHealthScore: number;
  growthScore: number;
}

export interface TenantBusinessSnapshot {
  tenantId: string;
  tenantName: string;
  storeStatus?: string;
  yesterdayRevenue: number;
  yesterdayOrders: number;
  todayOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  repeatCustomers: number;
  topSellingItem: string;
  lowestSellingItem: string;
  fastestGrowingItem: string;
  slowMovingItem: string;
  bestSellingHour: number;
  peakTrafficHour: number;
  revenueGrowthPct: number;
  avgPrepTimeMinutes: number;
  delayedOrders: number;
  kitchenHealthScore: number;
  businessHealthScore: number;
  growthScore: number;
  inventoryItems: InventoryStatusItem[];
  aiSuggestions: string[];
  demandPrediction: string;
  profitEstimate: number;
  commissionSaved: number;
  milestonesCrossed: number[];
  lowStockItems: string[];
  inactiveToday: boolean;
  newReviews: number;
  lowRating: boolean;
  paymentSettled: boolean;
  storeInactive: boolean;
}

export interface NotificationRuleContext {
  snapshot: TenantBusinessSnapshot;
  config: TenantNotificationConfig;
  existingRuleKeys: Set<string>;
}

export type ScheduledJobType =
  | 'morning_brief'
  | 'afternoon_brief'
  | 'evening_report'
  | 'weekly_report'
  | 'monthly_report'
  | 'critical_scan';
