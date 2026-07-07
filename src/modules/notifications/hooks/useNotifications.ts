import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { resolveOwnerTenantDocId } from '../../../lib/dashboardPriorityActions';
import { useAuth } from '../../../context/AuthContext';
import { notificationService } from '../NotificationService';
import { NotificationFilter, NotificationStatus, TenantNotification } from '../NotificationTypes';

const NOTIFICATION_POLL_MS = 12_000;

export function useNotifications(
  tenantId: string | undefined,
  previewLimit = 5,
  tenantSlug?: string
) {
  const { userProfile } = useAuth();
  const ownedTenantIds = userProfile?.ownedTenantIds;
  const resolvedTenantId = resolveOwnerTenantDocId(ownedTenantIds, tenantId, tenantSlug);
  const [notifications, setNotifications] = useState<TenantNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!resolvedTenantId || !ownedTenantIds?.includes(resolvedTenantId)) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const items = await notificationService.getRecent(
          resolvedTenantId,
          ownedTenantIds,
          Math.max(previewLimit, 50),
        );
        if (cancelled) return;
        const active = items.filter((n) => n.status !== NotificationStatus.ARCHIVED);
        setNotifications(active);
        setUnreadCount(active.filter((n) => n.status === NotificationStatus.UNREAD).length);
      } catch (error) {
        console.warn('Notification poll failed:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, NOTIFICATION_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [resolvedTenantId, ownedTenantIds, previewLimit]);

  const markRead = useCallback(
    async (notificationId: string) => {
      if (!resolvedTenantId) return;
      await notificationService.markRead(resolvedTenantId, ownedTenantIds, notificationId);
    },
    [resolvedTenantId, ownedTenantIds]
  );

  const markAllRead = useCallback(async () => {
    if (!resolvedTenantId) return;
    await notificationService.markAllRead(resolvedTenantId, ownedTenantIds);
  }, [resolvedTenantId, ownedTenantIds]);

  const archive = useCallback(
    async (notificationId: string) => {
      if (!resolvedTenantId) return;
      await notificationService.archive(resolvedTenantId, ownedTenantIds, notificationId);
    },
    [resolvedTenantId, ownedTenantIds]
  );

  const dismissAll = useCallback(async () => {
    if (!resolvedTenantId) return;
    await notificationService.archiveAll(resolvedTenantId, ownedTenantIds);
  }, [resolvedTenantId, ownedTenantIds]);

  const handleClick = useCallback(
    async (notification: TenantNotification) => {
      if (!resolvedTenantId) return;
      await notificationService.handleClick(resolvedTenantId, ownedTenantIds, notification);
    },
    [resolvedTenantId, ownedTenantIds]
  );

  const preview = useMemo(() => notifications.slice(0, previewLimit), [notifications, previewLimit]);

  return {
    notifications,
    preview,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    archive,
    dismissAll,
    handleClick,
  };
}

export function useNotificationCenter(tenantId: string | undefined, tenantSlug?: string) {
  const { userProfile } = useAuth();
  const ownedTenantIds = userProfile?.ownedTenantIds;
  const resolvedTenantId = resolveOwnerTenantDocId(ownedTenantIds, tenantId, tenantSlug);
  const [items, setItems] = useState<TenantNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotificationFilter>({ status: 'ALL', category: 'ALL' });
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!resolvedTenantId) return;
    setLoading(true);
    try {
      const result = await notificationService.list(resolvedTenantId, ownedTenantIds, {
        ...filter,
        search,
      }, 50);
      setItems(result.items);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [resolvedTenantId, ownedTenantIds, filter, search]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    items,
    loading,
    filter,
    setFilter,
    search,
    setSearch,
    reload: load,
    markRead: (id: string) => resolvedTenantId && notificationService.markRead(resolvedTenantId, ownedTenantIds, id),
    markAllRead: () => resolvedTenantId && notificationService.markAllRead(resolvedTenantId, ownedTenantIds),
    archive: (id: string) => resolvedTenantId && notificationService.archive(resolvedTenantId, ownedTenantIds, id),
    dismissAll: () => resolvedTenantId && notificationService.archiveAll(resolvedTenantId, ownedTenantIds),
  };
}

export function useNotificationSettings(tenantId: string | undefined) {
  const { userProfile } = useAuth();
  const ownedTenantIds = userProfile?.ownedTenantIds;
  const [config, setConfig] = useState<Awaited<ReturnType<typeof notificationService.getConfig>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    notificationService
      .getConfig(tenantId, ownedTenantIds)
      .then(setConfig)
      .finally(() => setLoading(false));
  }, [tenantId, ownedTenantIds]);

  const save = async () => {
    if (!tenantId || !config) return;
    setSaving(true);
    try {
      await notificationService.saveConfig(tenantId, ownedTenantIds, config);
    } finally {
      setSaving(false);
    }
  };

  return { config, setConfig, loading, saving, save };
}
