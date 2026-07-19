export const ANDROID_ORDER_UPDATES_CHANNEL_ID = 'order_updates';

export function buildFcmMulticastPayload(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string>,
) {
  const safeData = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, String(value || '')]),
  );

  return {
    tokens,
    notification: { title, body },
    data: safeData,
    android: {
      priority: 'high' as const,
      notification: {
        channelId: ANDROID_ORDER_UPDATES_CHANNEL_ID,
        sound: 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
        },
      },
    },
    webpush: {
      notification: {
        title,
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
      },
      fcmOptions: {
        link: safeData.url || safeData.path || '/my-orders',
      },
    },
  };
}
