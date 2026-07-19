import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('native push notifications', () => {
  it('uses Capacitor PushNotifications directly on native enable flow', () => {
    const page = readFileSync(
      join(root, 'src/presentation/notifications/OrderBhojanNotificationsPage.tsx'),
      'utf8',
    );
    assert.match(page, /requestNativePushPermission/);
    assert.match(page, /getLastNativePushRegistrationError/);
    assert.match(page, /Open Android Settings → Apps → OrderBhojan/);
  });

  it('bootstraps persistent registration listeners and Android channel', () => {
    const nativePush = readFileSync(join(root, 'src/lib/nativePushNotifications.ts'), 'utf8');
    assert.match(nativePush, /from '@capacitor\/push-notifications'/);
    assert.match(nativePush, /addListener\('registration'/);
    assert.match(nativePush, /createChannel\(/);
    assert.match(nativePush, /requestPermissions\(\)/);
    assert.doesNotMatch(nativePush, /await import\('@capacitor\/push-notifications'\)/);
  });

  it('declares Android default notification channel metadata', () => {
    const manifest = readFileSync(join(root, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
    const strings = readFileSync(join(root, 'android/app/src/main/res/values/strings.xml'), 'utf8');
    assert.match(manifest, /default_notification_channel_id/);
    assert.match(strings, /order_updates/);
    assert.match(manifest, /POST_NOTIFICATIONS/);
  });
});
