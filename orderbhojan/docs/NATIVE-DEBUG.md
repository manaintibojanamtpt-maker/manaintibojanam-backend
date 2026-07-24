# OrderBhojan native app debugging

## Enable in-app debug marks

In a dev build or on a device with Chrome remote debugging open:

```js
localStorage.setItem('ob:debug', '1');
window.__OB_DEBUG__ = true;
location.reload();
```

Perf marks are recorded on `window.__OB_PERF__` and logged when debug is enabled.

## Android WebView (Chrome DevTools)

1. Connect the device with USB debugging enabled.
2. Open `chrome://inspect/#devices` on desktop Chrome.
3. Select the OrderBhojan WebView under **Remote Target**.
4. Use **Network**, **Console**, and **Performance** tabs like a normal web app.

## adb logcat

```bash
adb logcat | findstr /I "OrderBhojan Capacitor chromium Firebase"
```

Filter Capacitor bridge errors:

```bash
adb logcat Capacitor:V CapacitorPlugin:V chromium:V *:S
```

## Common native issues

| Symptom | Check |
| --- | --- |
| Google sign-in fails | `google-services.json` must be **bhojanos-prod** (`project_number` `170989397954`), SHA-1 on that Android app, Google provider enabled |
| Header under notch | `capacitorBootstrap` ran; StatusBar overlay + `--ob-safe-top` on `<html>` |
| OAuth `localhost` in browser | Use native Google sign-in (`@capacitor-firebase/authentication`), not web redirect |
| Slow menu | Confirm `cap:sync` bundles `dist/` (no remote `server.url`) |

## Rebuild after web changes

```bash
cd orderbhojan
npm run cap:sync
npx cap run android
```

## Firebase Console checks (Google sign-in)

Native Android Google sign-in uses `@capacitor-firebase/authentication` with `skipNativeAuth: true`. The native layer returns a Google **id_token** whose audience must match the **Web OAuth client** in the same Firebase project as the JS SDK (`bhojanos-prod`, project number `170989397954`).

1. **Project:** [bhojanos-prod → Project settings](https://console.firebase.google.com/project/bhojanos-prod/settings/general)
2. **Android app:** `com.bhojanos.orderbhojan` (`1:170989397954:android:c72d024605511a5060185b`)
3. **SHA-1 / SHA-256:** Add debug + release keystore fingerprints under the Android app (Settings → Your apps). Debug SHA-1 from `orderbhojan/android` (`./gradlew signingReport`):
   `9A:0E:E4:A5:84:5D:72:B5:8D:71:E3:82:BE:0E:7E:A4:79:1B:30:5F`
   **Release SHA-1:** derive from the Play upload keystore (`keytool -list -v -keystore release.keystore`) and add it separately — see `docs/PLAY-INTERNAL-TESTING.md`. Google Sign-In on release/Internal Testing builds fails until this is registered.
   After adding SHA-1, re-download `google-services.json` — it should include an `oauth_client` entry with `client_type` **1** (Android), not just type **3** (Web).
4. **Google provider:** [Authentication → Sign-in method → Google](https://console.firebase.google.com/project/bhojanos-prod/authentication/providers) — enabled.
5. **Web client ID:** Authentication → Google → Web SDK configuration. Must match `BHOJANOS_PROD_GOOGLE_WEB_CLIENT_ID` in `src/config/clientConfig.ts` and `default_web_client_id` in `android/app/google-services.json`:
   `170989397954-6mimml7p7gft6vg71essvpt74bat4kbc.apps.googleusercontent.com`
6. **Do not use** `orderbhojan` project (`163241629968`) `google-services.json` for production builds — token audience will not match `bhojanos-prod` Auth.

After replacing `google-services.json`, always run `npm run cap:sync` before rebuilding the APK.
