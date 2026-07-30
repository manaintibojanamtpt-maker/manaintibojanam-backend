/**
 * Composite push readiness for OrderBhojan.
 *
 * Three signals exist and must not be conflated:
 * 1. OS/browser notification permission
 * 2. FCM token registration for this device (local + API)
 * 3. Firestore customer preference `notifications` (marketing/order preference — not device readiness)
 */

export type PushPermissionState = 'unknown' | 'granted' | 'denied' | 'prompt';

export type DevicePushStatus =
  | 'loading'
  | 'blocked'
  | 'needs_permission'
  | 'needs_registration'
  | 'ready';

export function mapNotificationPermission(
  permission: NotificationPermission | 'unknown' | undefined,
): PushPermissionState {
  if (permission === 'granted') return 'granted';
  if (permission === 'denied') return 'denied';
  if (permission === 'default') return 'prompt';
  return 'unknown';
}

export function resolveDevicePushStatus(input: {
  readonly permission: PushPermissionState;
  readonly deviceRegistered: boolean;
}): DevicePushStatus {
  if (input.permission === 'unknown') return 'loading';
  if (input.permission === 'denied') return 'blocked';
  if (input.permission === 'prompt') return 'needs_permission';
  // permission === 'granted'
  return input.deviceRegistered ? 'ready' : 'needs_registration';
}

export function settingsPushStatusLabel(status: DevicePushStatus): string {
  switch (status) {
    case 'ready':
      return 'On this device';
    case 'needs_registration':
      return 'Needs setup';
    case 'blocked':
      return 'Blocked';
    case 'needs_permission':
      return 'Off';
    case 'loading':
    default:
      return '…';
  }
}

export function notificationsEnableLabel(status: DevicePushStatus): string {
  switch (status) {
    case 'ready':
      return 'Re-register this device';
    case 'needs_registration':
      return 'Register this device';
    case 'blocked':
    case 'needs_permission':
    case 'loading':
    default:
      return 'Enable push notifications';
  }
}

export function notificationsStatusCopy(status: DevicePushStatus): string | null {
  switch (status) {
    case 'ready':
      return 'Notifications enabled for this device.';
    case 'needs_registration':
      return 'Notifications are allowed on this device. Tap Register to finish setup for order alerts.';
    case 'blocked':
      return 'Notification permission is blocked for this app.';
    case 'needs_permission':
      return null;
    case 'loading':
    default:
      return null;
  }
}

export function fingerprintPushToken(token: string): string {
  const trimmed = token.trim();
  if (trimmed.length <= 12) return trimmed;
  return `${trimmed.slice(0, 8)}…${trimmed.slice(-4)}`;
}
