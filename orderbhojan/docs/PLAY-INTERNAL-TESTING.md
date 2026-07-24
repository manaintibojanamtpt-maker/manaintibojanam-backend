# OrderBhojan — Play Internal Testing readiness

Focus: Android release signing, AAB generation, Firebase release SHA-1, versioning, and privacy/Data Safety.  
**No product/business logic changes are implied by this doc.**

---

## Implemented in repo vs manual console actions

| Item | Status |
| --- | --- |
| Release `signingConfigs` + `keystore.properties` loading | **In repo** |
| Gitignore for keystore / passwords | **In repo** |
| AAB npm scripts (`android:bundle`) | **In repo** |
| `version.properties` (`versionCode` / `versionName`) | **In repo** |
| In-app Privacy policy link (Profile) | **In repo** |
| Data Safety inventory draft | **In repo** (`DATA-SAFETY.md`) |
| Create release keystore + fill `keystore.properties` | **Manual (local)** |
| Add **release** SHA-1 to Firebase Android app | **Manual (Firebase Console)** |
| Re-download `google-services.json` after fingerprint add | **Manual (recommended)** |
| Play Console Data Safety form | **Manual (Play Console)** |
| Upload AAB to Internal testing track | **Manual (Play Console)** |

---

## Priority 1 — Release signing

### Required local files (never commit)

1. `orderbhojan/android/keystore.properties` (copy from `keystore.properties.example`)
2. Release keystore file, e.g. `orderbhojan/android/release.keystore` (or `.jks`)

### `keystore.properties` format

```properties
storeFile=release.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=orderbhojan
keyPassword=YOUR_KEY_PASSWORD
```

`storeFile` is relative to `orderbhojan/android/` (Gradle project root).

### Generate a keystore if missing

```bash
cd orderbhojan/android
keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore -alias orderbhojan -keyalg RSA -keysize 2048 -validity 10000
```

Then create `keystore.properties` with the passwords you chose.

### Safe fallback

If `keystore.properties` or the keystore file is missing/incomplete:

- **Debug builds** continue to work (unchanged).
- **Release** builds may still assemble but will **not** use the release signing config (Gradle warns). For Play upload you **must** have a properly signed release AAB.

---

## Priority 2 — AAB pipeline

From `orderbhojan/`:

```bash
npm run android:clean          # optional
npm run android:sync           # build web + cap sync
npm run android:bundle         # sync + Gradle bundleRelease
# or, after assets already synced:
npm run android:bundle:gradle-only
```

**Output AAB:**

`orderbhojan/android/app/build/outputs/bundle/release/app-release.aab`

---

## Priority 3 — Release SHA-1 / Firebase (manual)

Google Sign-In on **release** builds will fail until the **release keystore SHA-1** is registered. This cannot be faked in code.

### Derive release SHA-1

```bash
cd orderbhojan/android
keytool -list -v -keystore release.keystore -alias orderbhojan
```

Copy the **SHA-1** (and SHA-256) from the output.

Optional Gradle check (after keystore is configured):

```bash
npm run android:bundle:gradle-only
# or:
node scripts/android-gradle.mjs signingReport
```

### Where to add in Firebase

1. Open [Firebase Console → bhojanos-prod → Project settings](https://console.firebase.google.com/project/bhojanos-prod/settings/general)
2. Under **Your apps**, select Android app `com.bhojanos.orderbhojan`
3. **Add fingerprint** → paste release SHA-1 (and SHA-256)
4. Keep the existing debug SHA-1 as well for local debug builds

Debug SHA-1 (already documented for local):  
`9A:0E:E4:A5:84:5D:72:B5:8D:71:E3:82:BE:0E:7E:A4:79:1B:30:5F`

### Must you re-download `google-services.json`?

**Yes — recommended after adding or changing Android SHA fingerprints.**  
Firebase regenerates OAuth client entries; replace `orderbhojan/android/app/google-services.json`, then run `npm run android:sync` before building the next AAB.

### Release-readiness note

> **Google Sign-In on release / Internal Testing builds will fail until the release SHA-1 is registered in Firebase** for `com.bhojanos.orderbhojan` on project `bhojanos-prod`.

---

## Priority 4 — Version alignment

**Source of truth for Play uploads:** `orderbhojan/android/version.properties`

| Field | Current | Notes |
| --- | --- | --- |
| `versionName` | `0.9.0` | Align with `orderbhojan/package.json` base (`0.9.0-px2` → `0.9.0`) |
| `versionCode` | `2` | Must increase for every Play upload (was `1`) |

### Release bump process

1. Bump `versionCode` by at least +1 in `version.properties`
2. Update `versionName` when shipping a user-facing version change; keep in sync with `package.json` base semver
3. Optionally align `orderbhojan/package.json` `"version"` for npm/docs consistency
4. Rebuild AAB

---

## Priority 5 — Privacy policy URL

In-app link: **Profile → Privacy policy**  
Config constant: `orderbhojan/src/config/legalUrls.ts` → `PRIVACY_POLICY_URL`

Default: `https://www.bhojanos.com/privacy`  
Paste the final hosted URL there if the canonical policy moves.

Data Safety inventory: `orderbhojan/docs/DATA-SAFETY.md`

---

## Pre-upload checklist

- [ ] Keystore file present (`release.keystore` / `.jks`)
- [ ] `keystore.properties` present and filled
- [ ] `signingConfig` wired (release build uses release key)
- [ ] Release SHA-1 added in Firebase
- [ ] `google-services.json` refreshed if fingerprints changed + `android:sync`
- [ ] `versionCode` bumped in `version.properties`
- [ ] Privacy policy URL ready / live
- [ ] Play Data Safety form prepared from `DATA-SAFETY.md`
- [ ] AAB generated at path above
