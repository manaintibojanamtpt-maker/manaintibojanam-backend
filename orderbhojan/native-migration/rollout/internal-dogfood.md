# Internal dogfood — native order tracking

**Package/bundle:** `com.bhojanos.orderbhojan` (unchanged)  
**Status:** internal dogfood only — **no public canary** until 48h green  
**Default:** flags OFF → hybrid track only  
**Rollback:** set `VITE_FF_NATIVE_TRACK=false` (or `VITE_FF_NATIVE_HOST=false`) and rebuild

## Dogfood build config (local only — gitignored)

Create `orderbhojan/.env.production.local` (do **not** commit):

```env
VITE_FF_NATIVE_HOST=true
VITE_FF_NATIVE_TRACK=true
VITE_OB_NATIVE_TRACK_PCT=0
VITE_OB_NATIVE_TRACK_INTERNAL_EMAILS=bhojanos26@gmail.com
```

Do **not** set pct > 0 until 48h internal green.

## Build commands

### Android (Windows)
```powershell
cd orderbhojan
npm run build
npx cap sync android
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$gradle = "$env:USERPROFILE\.gradle\wrapper\dists\gradle-8.14.3-all\10utluxaxniiv4wxiphsi49nj\gradle-8.14.3\bin\gradle.bat"
& $gradle -p android :app:assembleDebug
```
**Output:** `android/app/build/outputs/apk/debug/app-debug.apk`

If `gradlew` times out downloading Gradle, use the cached `$gradle` path above.

### iOS (Mac required)
```bash
cd orderbhojan
npm run build
npx cap sync ios
open ios/App/App.xcworkspace   # or App.xcodeproj
# Xcode → Product → Archive → TestFlight internal
```
Same `.env.production.local` flags apply to the Vite build.

## Verification matrix (manual — dogfood)

| Case | Steps | Pass |
|------|-------|------|
| Signed-in track | Allowlisted email → open `/orders/{id}/track` | Native Track UI; Back → hybrid |
| Guest track | Sign out → track URL + phone | Native guest tracking or hybrid guest form then native |
| Deep link | `adb shell am start -a android.intent.action.VIEW -d "orderbhojan://orders/{id}/track"` | Native if cohort; else hybrid route |
| Push | Tap notification with `data.path=/orders/{id}/track` | `push_open_track` + native or hybrid |
| Non-cohort | Different email / not on allowlist | Hybrid only; `native_track_fallback_hybrid` |
| Rollback drill | Set `VITE_FF_NATIVE_TRACK=false`, rebuild, reinstall | Hybrid track only; no native Activity |

## Rollback drill
1. In `.env.production.local`: `VITE_FF_NATIVE_TRACK=false` (keep host true or false — track false is enough).
2. `npm run build && npx cap sync android` (or iOS).
3. Reinstall APK / TestFlight build.
4. Open track → must stay on hybrid WebView; no native overlay.

## Analytics (debug)
- Cohort native: `native_track_open` with `impl=native`
- Fallback: `native_track_fallback_hybrid` with `reason`
- Push: `push_open_track`

## Abort
- Crash / blank track / 401 spike → kill switches OFF immediately
- Do not remove hybrid route
- Do not raise pct until coordinator approves after 48h

## Out of scope
Checkout, payments, voice, public canary
