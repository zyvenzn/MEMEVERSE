# MEMEVERSE Offline and Android Build

## Current release model

MEMEVERSE Terminal Release 1.0 is an offline-first **simulated trading application**. It does not connect to brokers, exchanges, banks, or live market data. All quotes are generated locally and all funds are virtual.

## Local web development

Serve the repository root through HTTPS or localhost. IndexedDB and Service Worker behavior is not guaranteed from `file://` URLs.

## Android prerequisites

- Node.js 22 or newer.
- Android Studio 2025.2.1 or newer for Capacitor 8.
- Android SDK Platform 36 (Android 16) for the planned Google Play target.
- A Java/Gradle toolchain supported by the installed Android Studio.

## Build Android project

```bash
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

After the native Android project has been created once, use:

```bash
npm run android:sync
npm run android:open
```

The repository intentionally does not commit generated Gradle output, signing keys, or local Android Studio state. Create and protect signing credentials locally; never commit them.

## Android app assets

The current repository includes an SVG application mark for web/PWA use. Before Play Store submission, generate and review the required Android launcher icon, adaptive icon, splash-screen and store listing artwork. Use a 1024x1024 PNG source under the Capacitor Assets workflow, then run `npm run assets:generate`.

## Offline behavior

- Service Worker caches the application shell for supported web browsers.
- Capacitor packages the web application into the Android app bundle.
- IndexedDB stores local virtual cash, positions, orders, watchlist, simulated candles and trade history.
- Desktop and Android installations have separate local databases. No cloud synchronization is included.
- Browser storage can be cleared by the operating system/user. Export/import backup is a required follow-up before public release.

## Google Play release gates

1. Confirm current Play target API requirements at submission time. The intended target is Android 16 / API 36 or higher.
2. Test on physical Android devices and multiple screen sizes.
3. Test airplane mode after first launch and after a full app restart.
4. Verify IndexedDB persistence, reset behavior and recovery from unavailable storage.
5. Add privacy policy and accurate Data safety disclosures.
6. Create a signed Android App Bundle (AAB).
7. Complete Play Console internal/closed testing requirements applicable to the developer account.
8. Do not publish without explicit product-owner approval.

## Known limitations in this initial implementation

- Generated market prices are synthetic and are not financial market data.
- The current chart is a lightweight canvas candlestick renderer, not a full professional charting package.
- Timeframe aggregation is limited by locally retained simulated candle history.
- Local data is device-specific and has no backup/sync feature yet.
- No broker/exchange connectivity or real-money functionality exists.
