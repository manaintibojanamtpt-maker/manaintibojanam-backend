export type NotificationTokenEntry = {
  token?: unknown;
  platform?: unknown;
};

export function extractPushTokensFromUserDoc(
  data: Record<string, unknown> | undefined | null,
): string[] {
  if (!data) return [];
  const fromDevice = Array.isArray(data.deviceTokens) ? data.deviceTokens : [];
  const fromFcm = Array.isArray(data.fcmTokens) ? data.fcmTokens : [];
  return [...fromDevice, ...fromFcm].filter(
    (token): token is string => typeof token === 'string' && token.trim().length > 0,
  );
}

export function extractPushTokensFromCustomerDoc(
  data: Record<string, unknown> | undefined | null,
): string[] {
  if (!data) return [];
  const entries = Array.isArray(data.notificationTokens) ? data.notificationTokens : [];
  return entries
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim();
      if (entry && typeof entry === 'object') {
        const token = (entry as NotificationTokenEntry).token;
        return typeof token === 'string' ? token.trim() : '';
      }
      return '';
    })
    .filter(Boolean);
}

export function mergePushTokens(...groups: readonly (readonly string[])[]): string[] {
  return Array.from(new Set(groups.flat().map((token) => token.trim()).filter(Boolean)));
}

export function resolveCustomerPushTokens(
  userData: Record<string, unknown> | undefined | null,
  customerData: Record<string, unknown> | undefined | null,
): string[] {
  return mergePushTokens(
    extractPushTokensFromUserDoc(userData),
    extractPushTokensFromCustomerDoc(customerData),
  );
}
