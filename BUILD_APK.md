# Building a Shareable APK

How to produce an installable `.apk` you can send directly to friends (no Play Store, no EAS account needed).

The release build type is already configured (`android/app/build.gradle`) to sign with the debug keystore, so `assembleRelease` works out of the box. This is fine for sharing with friends — it just isn't eligible for the Play Store.

## First build / after native changes

Run this whenever you change anything **native**: `app.json`'s `icon`, `splash`, `permissions`, `package`, or `plugins`, or when you add/remove a native dependency in `package.json`.

```bash
npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease
```

`--clean` regenerates the native `/android` project from the current `app.json`/config so native changes actually take effect.

## Incremental build (JS/TS/UI changes only)

For the common case — screens, components, services, styling — you don't need to re-run prebuild:

```bash
cd android
./gradlew assembleRelease
```

Gradle's daemon caches the native build and only re-bundles the JS, so this is much faster than a cold build.

## Output

Every build (clean or incremental) produces the APK at the same path:

```
android/app/build/outputs/apk/release/app-release.apk
```

Send that file to friends (AirDrop/Drive/WhatsApp/etc.). They'll need to enable "Install unknown apps" for whichever app they use to open it.

## Before sharing a new build

Bump `android.versionCode` in `app.json`. Not required to reinstall over an old APK (same debug signing key either way), but it makes it easy for you and your friends to tell which build is installed.

## Alternative: EAS Build (cloud)

If you'd rather not manage local builds, `eas.json` already has a `preview` profile configured to produce an APK:

```bash
npx eas login
npx eas build --profile preview --platform android
```

Expo builds it on their servers and gives you a download link — free tier covers occasional builds, no local keystore/signing setup needed.
