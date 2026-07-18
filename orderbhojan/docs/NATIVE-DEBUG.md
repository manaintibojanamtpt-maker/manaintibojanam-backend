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
| Google sign-in fails | Firebase SHA-1, `google-services.json`, Google provider enabled |
| Header under notch | `capacitorBootstrap` ran; StatusBar overlay + `--ob-safe-top` on `<html>` |
| OAuth `localhost` in browser | Use native Google sign-in (`@capacitor-firebase/authentication`), not web redirect |
| Slow menu | Confirm `cap:sync` bundles `dist/` (no remote `server.url`) |

## Rebuild after web changes

```bash
cd orderbhojan
npm run cap:sync
npx cap run android
```
