import { EnvironmentConfig } from '../../config/environment';
import { notificationEngine } from './NotificationEngine';
import { notificationRepository } from './NotificationRepository';
import {
  NotificationCreateInput,
  NotificationFilter,
  NotificationPriority,
  ScheduledJobType,
  TenantNotification,
  TenantNotificationConfig,
} from './NotificationTypes';
import { createEmailProvider } from './EmailProvider';
import { createPushProvider } from './PushProvider';
import { createWhatsAppProvider } from './WhatsAppProvider';
import { buildDailyBriefWhatsApp, snapshotToDailyBriefMetrics } from './NotificationTemplates';

export class NotificationService {
  private whatsapp = createWhatsAppProvider('meta');
  private email = createEmailProvider(EnvironmentConfig.getApiUrl());
  private push = createPushProvider(EnvironmentConfig.getApiUrl());

  assertTenantAccess(requestedTenantId: string, ownedTenantIds: string[] | undefined): void {
    if (!requestedTenantId || !ownedTenantIds?.includes(requestedTenantId)) {
      throw new Error('Unauthorized: tenant access denied');
    }
  }

  async list(
    tenantId: string,
    ownedTenantIds: string[] | undefined,
    filter: NotificationFilter = {},
    pageSize?: number
  ) {
    this.assertTenantAccess(tenantId, ownedTenantIds);
    return notificationRepository.list(tenantId, filter, pageSize);
  }

  async getRecent(tenantId: string, ownedTenantIds: string[] | undefined, count = 5) {
    this.assertTenantAccess(tenantId, ownedTenantIds);
    return notificationRepository.getRecent(tenantId, count);
  }

  async getUnreadCount(tenantId: string, ownedTenantIds: string[] | undefined) {
    this.assertTenantAccess(tenantId, ownedTenantIds);
    return notificationRepository.getUnreadCount(tenantId);
  }

  async markRead(tenantId: string, ownedTenantIds: string[] | undefined, notificationId: string) {
    this.assertTenantAccess(tenantId, ownedTenantIds);
    await notificationRepository.markRead(tenantId, notificationId);
  }

  async markAllRead(tenantId: string, ownedTenantIds: string[] | undefined) {
    this.assertTenantAccess(tenantId, ownedTenantIds);
    await notificationRepository.markAllRead(tenantId);
  }

  async archive(tenantId: string, ownedTenantIds: string[] | undefined, notificationId: string) {
    this.assertTenantAccess(tenantId, ownedTenantIds);
    await notificationRepository.archive(tenantId, notificationId);
  }

  async archiveAll(tenantId: string, ownedTenantIds: string[] | undefined) {
    this.assertTenantAccess(tenantId, ownedTenantIds);
    return notificationRepository.archiveAll(tenantId);
  }

  async handleClick(
    tenantId: string,
    ownedTenantIds: string[] | undefined,
    notification: TenantNotification
  ) {
    this.assertTenantAccess(tenantId, ownedTenantIds);
    await notificationRepository.recordClick(tenantId, notification.id);
  }

  async recordDrawerOpened(tenantId: string, ownedTenantIds: string[] | undefined) {
    this.assertTenantAccess(tenantId, ownedTenantIds);
    await notificationRepository.recordOpened(tenantId);
  }

  async getConfig(tenantId: string, ownedTenantIds: string[] | undefined) {
    this.assertTenantAccess(tenantId, ownedTenantIds);
    return notificationRepository.getConfig(tenantId);
  }

  async saveConfig(
    tenantId: string,
    ownedTenantIds: string[] | undefined,
    config: TenantNotificationConfig
  ) {
    this.assertTenantAccess(tenantId, ownedTenantIds);
    await notificationRepository.saveConfig(tenantId, config);
  }

  async getAnalytics(tenantId: string, ownedTenantIds: string[] | undefined) {
    this.assertTenantAccess(tenantId, ownedTenantIds);
    return notificationRepository.getAnalytics(tenantId);
  }

  async createInApp(tenantId: string, input: NotificationCreateInput): Promise<TenantNotification> {
    return notificationRepository.create(tenantId, input);
  }

  async dispatchExternalChannels(
    tenantId: string,
    config: TenantNotificationConfig,
    notification: NotificationCreateInput,
    ownerPhone?: string,
    ownerEmail?: string,
    ownerId?: string
  ): Promise<void> {
    const phone = ownerPhone || config.ownerPhone;
    const email = ownerEmail || config.ownerEmail;
    const isCritical = notification.priority === NotificationPriority.CRITICAL;

    if (
      config.whatsappEnabled &&
      phone &&
      (notification.sentVia.whatsapp || isCritical)
    ) {
      const result = isCritical
        ? await this.whatsapp.sendCriticalAlert(
            phone,
            notification.title,
            notification.message,
            `${EnvironmentConfig.getBaseUrl()}${notification.actionUrl || '/owner/dashboard'}`
          )
        : await this.whatsapp.sendMessage(phone, `${notification.title}\n\n${notification.message}`);
      if (!result.success) {
        await notificationRepository.incrementAnalytics(tenantId, { failed: 1 });
      }
    }

    if (config.emailEnabled && email && notification.sentVia.email) {
      const result = await this.email.sendEmail(
        email,
        notification.title,
        `<p>${notification.message}</p>`
      );
      if (!result.success) {
        await notificationRepository.incrementAnalytics(tenantId, { failed: 1 });
      }
    }

    if (config.pushEnabled && ownerId && (notification.sentVia.push || isCritical)) {
      const result = await this.push.sendToUser(ownerId, {
        title: notification.title,
        body: notification.message,
        actionUrl: notification.actionUrl,
      });
      if (!result.success) {
        await notificationRepository.incrementAnalytics(tenantId, { failed: 1 });
      }
    }
  }

  async triggerServerAnalysis(tenantId: string, jobType?: ScheduledJobType): Promise<void> {
    const apiUrl = EnvironmentConfig.getApiUrl();
    await fetch(`${apiUrl}/api/notifications/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, jobType }),
    }).catch(() => {});
  }
}

export const notificationService = new NotificationService();

export { notificationEngine, notificationRepository, buildDailyBriefWhatsApp, snapshotToDailyBriefMetrics };
