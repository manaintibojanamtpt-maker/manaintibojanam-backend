import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { getDb } from '../../../lib/firebase-db';
import { useAuth } from '../../../context/AuthContext';
import { notificationService } from '../NotificationService';
import { NotificationFilter, NotificationStatus, TenantNotification } from '../NotificationTypes';

const DEBOUNCE_MS = 300;

export function useNotifications(tenantId: string | undefined, previewLimit = 5) {
  const { userProfile } = useAuth();
  const ownedTenantIds = userProfile?.ownedTenantIds;
  const [notifications, setNotifications] = useState<TenantNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!tenantId || !ownedTenantIds?.includes(tenantId)) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const q = query(
      collection(getDb(), 'tenants', tenantId, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(Math.max(previewLimit, 50))
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          const items = snapshot.docs.map((d) => d.data() as TenantNotification);
          setNotifications(items);
          setUnreadCount(items.filter((n) => n.status === NotificationStatus.UNREAD).length);
          setLoading(false);
        }, DEBOUNCE_MS);
      },
      () => setLoading(false)
    );

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      unsubscribe();
    };
  }, [tenantId, ownedTenantIds, previewLimit]);

  const markRead = useCallback(
    async (notificationId: string) => {
      if (!tenantId) return;
      await notificationService.markRead(tenantId, ownedTenantIds, notificationId);
    },
    [tenantId, ownedTenantIds]
  );

  const markAllRead = useCallback(async () => {
    if (!tenantId) return;
    await notificationService.markAllRead(tenantId, ownedTenantIds);
  }, [tenantId, ownedTenantIds]);

  const handleClick = useCallback(
    async (notification: TenantNotification) => {
      if (!tenantId) return;
      await notificationService.handleClick(tenantId, ownedTenantIds, notification);
    },
    [tenantId, ownedTenantIds]
  );

  const preview = useMemo(() => notifications.slice(0, previewLimit), [notifications, previewLimit]);

  return {
    notifications,
    preview,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    handleClick,
  };
}

export function useNotificationCenter(tenantId: string | undefined) {
  const { userProfile } = useAuth();
  const ownedTenantIds = userProfile?.ownedTenantIds;
  const [items, setItems] = useState<TenantNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotificationFilter>({ status: 'ALL', category: 'ALL' });
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const result = await notificationService.list(tenantId, ownedTenantIds, {
        ...filter,
        search,
      }, 50);
      setItems(result.items);
    } finally {
      setLoading(false);
    }
  }, [tenantId, ownedTenantIds, filter, search]);

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
    markRead: (id: string) => tenantId && notificationService.markRead(tenantId, ownedTenantIds, id),
    markAllRead: () => tenantId && notificationService.markAllRead(tenantId, ownedTenantIds),
    archive: (id: string) => tenantId && notificationService.archive(tenantId, ownedTenantIds, id),
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
