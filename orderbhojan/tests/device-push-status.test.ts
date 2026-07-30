import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, beforeEach } from 'node:test';
import {
  fingerprintPushToken,
  mapNotificationPermission,
  notificationsEnableLabel,
  notificationsStatusCopy,
  resolveDevicePushStatus,
  settingsPushStatusLabel,
} from '../src/features/notifications/domain/devicePushStatus.ts';
import {
  clearDevicePushRegistration,
  isDevicePushRegisteredForPlatform,
  markDevicePushRegistered,
  readDevicePushRegistration,
} from '../src/features/notifications/infrastructure/devicePushRegistrationStore.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('device push status domain', () => {
  it('maps Notification.permission values', () => {
    assert.equal(mapNotificationPermission('granted'), 'granted');
    assert.equal(mapNotificationPermission('denied'), 'denied');
    assert.equal(mapNotificationPermission('default'), 'prompt');
    assert.equal(mapNotificationPermission('unknown'), 'unknown');
  });

  it('resolves composite status from permission + registration', () => {
    assert.equal(resolveDevicePushStatus({ permission: 'unknown', deviceRegistered: false }), 'loading');
    assert.equal(resolveDevicePushStatus({ permission: 'denied', deviceRegistered: true }), 'blocked');
    assert.equal(resolveDevicePushStatus({ permission: 'prompt', deviceRegistered: false }), 'needs_permission');
    assert.equal(resolveDevicePushStatus({ permission: 'prompt', deviceRegistered: true }), 'blocked');
    assert.equal(
      resolveDevicePushStatus({ permission: 'granted', deviceRegistered: false }),
      'needs_registration',
    );
    assert.equal(resolveDevicePushStatus({ permission: 'granted', deviceRegistered: true }), 'ready');
  });

  it('keeps Settings labels distinct from Firestore preference On/Off', () => {
    assert.equal(settingsPushStatusLabel('ready'), 'On this device');
    assert.equal(settingsPushStatusLabel('needs_registration'), 'Needs setup');
    assert.equal(settingsPushStatusLabel('blocked'), 'Blocked');
    assert.equal(settingsPushStatusLabel('needs_permission'), 'Off');
    assert.notEqual(settingsPushStatusLabel('needs_registration'), 'On');
  });

  it('uses Register / Re-register labels for granted permission', () => {
    assert.equal(notificationsEnableLabel('needs_registration'), 'Register this device');
    assert.equal(notificationsEnableLabel('ready'), 'Re-register this device');
    assert.equal(notificationsEnableLabel('needs_permission'), 'Enable push notifications');
    assert.match(notificationsStatusCopy('needs_registration') ?? '', /Tap Register/);
  });

  it('fingerprints tokens without storing the full secret in the fingerprint helper', () => {
    const fp = fingerprintPushToken('abcdefghijklmnop1234');
    assert.equal(fp, 'abcdefgh…1234');
    assert.doesNotMatch(fp, /ijklmnop/);
  });
});

describe('device push registration store', () => {
  beforeEach(() => {
    const memory = new Map<string, string>();
    // Node test env has no browser localStorage — provide a minimal polyfill.
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memory.set(key, String(value));
        },
        removeItem: (key: string) => {
          memory.delete(key);
        },
      },
    });
    clearDevicePushRegistration();
  });

  it('persists and hydrates registration for the current platform', () => {
    assert.equal(isDevicePushRegisteredForPlatform('android'), false);
    markDevicePushRegistered({ platform: 'android', token: 'token-android-abcdef-9999' });
    assert.equal(isDevicePushRegisteredForPlatform('android'), true);
    assert.equal(isDevicePushRegisteredForPlatform('web'), false);
    const record = readDevicePushRegistration();
    assert.equal(record?.platform, 'android');
    assert.equal(record?.tokenFingerprint, 'token-an…9999');
  });
});

describe('settings + notifications wiring', () => {
  it('Settings uses device push status instead of Firestore preference default', () => {
    const settings = readFileSync(
      join(root, 'src/presentation/settings/OrderBhojanSettingsPreferences.tsx'),
      'utf8',
    );
    assert.match(settings, /useDevicePushStatus/);
    assert.match(settings, /devicePush\.settingsLabel/);
    assert.doesNotMatch(settings, /prefs\?\.notifications === false \? 'Off' : 'On'/);
  });

  it('Notifications page hydrates registration and marks local store on success', () => {
    const page = readFileSync(
      join(root, 'src/presentation/notifications/OrderBhojanNotificationsPage.tsx'),
      'utf8',
    );
    assert.match(page, /useDevicePushStatus/);
    assert.match(page, /push\.markRegistered/);
    assert.match(page, /notificationsEnableLabel/);
    assert.match(page, /updateCustomerPreferences/);
  });
});
