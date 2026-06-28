import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  startAfter,
  updateDoc,
  writeBatch,
  QueryDocumentSnapshot,
  DocumentData,
  increment,
} from 'firebase/firestore';
import { getDb } from '../../lib/firebase-db';
import {
  DEFAULT_NOTIFICATION_CONFIG,
  NotificationAnalytics,
  NotificationCreateInput,
  NotificationFilter,
  NotificationStatus,
  TenantNotification,
  TenantNotificationConfig,
} from './NotificationTypes';

const PAGE_SIZE = 20;

const notificationsRef = (tenantId: string) =>
  collection(getDb(), 'tenants', tenantId, 'notifications');

const analyticsRef = (tenantId: string) =>
  doc(getDb(), 'tenants', tenantId, 'notification_analytics', 'summary');

export class NotificationRepository {
  async create(tenantId: string, input: NotificationCreateInput): Promise<TenantNotification> {
    const ref = doc(notificationsRef(tenantId));
    const now = new Date().toISOString();
    const notification: TenantNotification = {
      id: ref.id,
      tenantId,
      title: input.title,
      message: input.message,
      type: input.type,
      priority: input.priority,
      category: input.category,
      status: input.status || NotificationStatus.UNREAD,
      createdAt: now,
      readAt: null,
      sentVia: input.sentVia,
      metadata: input.metadata || {},
      actionUrl: input.actionUrl,
      expiresAt: input.expiresAt ?? null,
    };

    await setDoc(ref, notification);
    await this.incrementAnalytics(tenantId, { sent: 1 });
    return notification;
  }

  async createBatch(tenantId: string, inputs: NotificationCreateInput[]): Promise<TenantNotification[]> {
    if (inputs.length === 0) return [];

    const db = getDb();
    const batch = writeBatch(db);
    const created: TenantNotification[] = [];
    const now = new Date().toISOString();

    inputs.forEach((input) => {
      const ref = doc(notificationsRef(tenantId));
      const notification: TenantNotification = {
        id: ref.id,
        tenantId,
        title: input.title,
        message: input.message,
        type: input.type,
        priority: input.priority,
        category: input.category,
        status: input.status || NotificationStatus.UNREAD,
        createdAt: now,
        readAt: null,
        sentVia: input.sentVia,
        metadata: input.metadata || {},
        actionUrl: input.actionUrl,
        expiresAt: input.expiresAt ?? null,
      };
      batch.set(ref, notification);
      created.push(notification);
    });

    await batch.commit();
    await this.incrementAnalytics(tenantId, { sent: inputs.length });
    return created;
  }

  async list(
    tenantId: string,
    filter: NotificationFilter = {},
    pageSize = PAGE_SIZE,
    cursor?: QueryDocumentSnapshot<DocumentData>
  ): Promise<{ items: TenantNotification[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
    let q = query(
      notificationsRef(tenantId),
      orderBy('createdAt', 'desc'),
      limit(Math.min(pageSize * 3, 150))
    );

    if (cursor) {
      q = query(q, startAfter(cursor));
    }

    const snapshot = await getDocs(q);
    let items = snapshot.docs.map((d) => d.data() as TenantNotification);

    if (filter.status && filter.status !== 'ALL') {
      items = items.filter((n) => n.status === filter.status);
    } else {
      items = items.filter((n) => n.status !== NotificationStatus.ARCHIVED);
    }

    if (filter.category && filter.category !== 'ALL') {
      items = items.filter((n) => n.category === filter.category);
    }

    if (filter.priority && filter.priority !== 'ALL') {
      items = items.filter((n) => n.priority === filter.priority);
    }

    if (filter.search?.trim()) {
      const term = filter.search.trim().toLowerCase();
      items = items.filter(
        (n) =>
          n.title.toLowerCase().includes(term) ||
          n.message.toLowerCase().includes(term)
      );
    }

    items = items.slice(0, pageSize);
    const lastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
    return { items, lastDoc };
  }

  async getUnreadCount(tenantId: string): Promise<number> {
    const q = query(
      notificationsRef(tenantId),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.filter((d) => (d.data() as TenantNotification).status === NotificationStatus.UNREAD).length;
  }

  async markRead(tenantId: string, notificationId: string): Promise<void> {
    const ref = doc(getDb(), 'tenants', tenantId, 'notifications', notificationId);
    await updateDoc(ref, {
      status: NotificationStatus.READ,
      readAt: new Date().toISOString(),
    });
    await this.incrementAnalytics(tenantId, { read: 1 });
  }

  async markAllRead(tenantId: string): Promise<void> {
    const q = query(
      notificationsRef(tenantId),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const snapshot = await getDocs(q);
    const unreadDocs = snapshot.docs.filter(
      (d) => (d.data() as TenantNotification).status === NotificationStatus.UNREAD
    );
    if (unreadDocs.length === 0) return;

    const batch = writeBatch(getDb());
    const now = new Date().toISOString();
    unreadDocs.forEach((d) => {
      batch.update(d.ref, { status: NotificationStatus.READ, readAt: now });
    });
    await batch.commit();
    await this.incrementAnalytics(tenantId, { read: unreadDocs.length });
  }

  async archive(tenantId: string, notificationId: string): Promise<void> {
    const ref = doc(getDb(), 'tenants', tenantId, 'notifications', notificationId);
    await updateDoc(ref, { status: NotificationStatus.ARCHIVED });
  }

  async archiveAll(tenantId: string): Promise<number> {
    const q = query(
      notificationsRef(tenantId),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const snapshot = await getDocs(q);
    const toArchive = snapshot.docs.filter(
      (d) => (d.data() as TenantNotification).status !== NotificationStatus.ARCHIVED
    );
    if (toArchive.length === 0) return 0;

    const batch = writeBatch(getDb());
    toArchive.forEach((d) => {
      batch.update(d.ref, { status: NotificationStatus.ARCHIVED });
    });
    await batch.commit();
    return toArchive.length;
  }

  async getRecent(tenantId: string, count = 5): Promise<TenantNotification[]> {
    const q = query(notificationsRef(tenantId), orderBy('createdAt', 'desc'), limit(count));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as TenantNotification);
  }

  async getExistingRuleKeys(tenantId: string, sinceIso: string): Promise<Set<string>> {
    const q = query(
      notificationsRef(tenantId),
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    const snapshot = await getDocs(q);
    const keys = new Set<string>();
    snapshot.docs.forEach((d) => {
      const data = d.data() as TenantNotification;
      if (data.createdAt < sinceIso) return;
      const ruleId = data.metadata?.ruleId as string | undefined;
      if (ruleId) keys.add(ruleId);
    });
    return keys;
  }

  async getConfig(tenantId: string): Promise<TenantNotificationConfig> {
    const tenantRef = doc(getDb(), 'tenants', tenantId);
    const snap = await getDoc(tenantRef);
    if (!snap.exists()) return { ...DEFAULT_NOTIFICATION_CONFIG };
    const data = snap.data();
    return {
      ...DEFAULT_NOTIFICATION_CONFIG,
      ...(data.notificationConfig || {}),
      ownerPhone: data.contact?.whatsapp || data.notificationConfig?.ownerPhone,
      ownerEmail: data.ownerEmail || data.notificationConfig?.ownerEmail,
    };
  }

  async saveConfig(tenantId: string, config: TenantNotificationConfig): Promise<void> {
    const tenantRef = doc(getDb(), 'tenants', tenantId);
    await updateDoc(tenantRef, { notificationConfig: config });
  }

  async incrementAnalytics(
    tenantId: string,
    deltas: Partial<Pick<NotificationAnalytics, 'sent' | 'opened' | 'read' | 'clicked' | 'failed'>>
  ): Promise<void> {
    const ref = analyticsRef(tenantId);
    const payload: Record<string, unknown> = { lastUpdated: new Date().toISOString() };
    if (deltas.sent) payload.sent = increment(deltas.sent);
    if (deltas.opened) payload.opened = increment(deltas.opened);
    if (deltas.read) payload.read = increment(deltas.read);
    if (deltas.clicked) payload.clicked = increment(deltas.clicked);
    if (deltas.failed) payload.failed = increment(deltas.failed);

    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, {
        sent: deltas.sent || 0,
        opened: deltas.opened || 0,
        read: deltas.read || 0,
        clicked: deltas.clicked || 0,
        failed: deltas.failed || 0,
        lastUpdated: new Date().toISOString(),
      });
    }
  }

  async getAnalytics(tenantId: string): Promise<NotificationAnalytics> {
    const snap = await getDoc(analyticsRef(tenantId));
    if (!snap.exists()) {
      return { sent: 0, opened: 0, read: 0, clicked: 0, failed: 0, lastUpdated: new Date().toISOString() };
    }
    return snap.data() as NotificationAnalytics;
  }

  async recordClick(tenantId: string, notificationId: string): Promise<void> {
    await this.incrementAnalytics(tenantId, { clicked: 1 });
    await this.markRead(tenantId, notificationId);
  }

  async recordOpened(tenantId: string): Promise<void> {
    await this.incrementAnalytics(tenantId, { opened: 1 });
  }
}

export const notificationRepository = new NotificationRepository();
