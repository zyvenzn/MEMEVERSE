# MEMEVERSE Terminal

**MEMEVERSE — Hybrid Professional Trading Terminal.**

Release 1.0 is an offline-first simulated trading application for desktop web and Android.

## Product scope

- Cryptocurrency simulator.
- Stock simulator.
- Forex simulator.
- Desktop professional multi-panel terminal.
- Dedicated responsive mobile experience.
- Simulated market/limit orders.
- Virtual cash, positions, portfolio, watchlist and trade history.
- Local persistence using IndexedDB.
- PWA Service Worker for application-shell caching.
- Android packaging through Capacitor 8.

All quotes and transactions are synthetic/demo only. There is no broker, exchange, bank, live market data or real-money execution.

## Current architecture

- Shared frontend: vanilla HTML, CSS and JavaScript.
- Local database: IndexedDB.
- Web offline caching: Service Worker.
- Desktop hosting: Vercel static deployment.
- Android: Capacitor 8.6.0.
- Legacy Supabase Auth, database, wallet, Edge Functions and historical modules remain preserved but are not required for offline simulation.

## Local development

Use Node.js 22+ and serve the repository root through HTTPS or localhost. IndexedDB is required for persistent account state.

## Android build

Install Android Studio 2025.2.1+ and Android SDK Platform 36.

```bash
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

After creating the Android project once:

```bash
npm run android:sync
npm run android:open
```

See [Offline and Android build guide](docs/OFFLINE_ANDROID.md).

## Existing infrastructure preservation

The primary Supabase project and historical branches/PRs are intentionally retained. The old X-Network Supabase project is not deleted. No destructive database migrations, PR merges, production deployments or real-money integrations are part of this work.

## Release status

This is an active development branch, not a completed Play Store release. Physical-device testing, generated Android assets, backup/restore, security review, signed AAB creation and Play Console review remain release gates.
