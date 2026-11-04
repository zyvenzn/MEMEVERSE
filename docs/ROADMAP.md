# MEMEVERSE Terminal Roadmap

**Active product:** Hybrid professional trading terminal for Desktop Web and Android.
**Release 1.0 mode:** Offline simulation with virtual funds only.
**Markets:** Cryptocurrency, Stocks, Forex.

X / Social Network, Messenger, Community and Pump.fun are outside the active product scope. Their historical code, database objects, Supabase projects, branches and pull requests are retained. No destructive cleanup is authorized.

## Current implementation snapshot

- [x] Dedicated terminal-only navigation and overview.
- [x] Desktop multi-panel dashboard layout.
- [x] Dedicated responsive mobile navigation and layout.
- [x] Crypto, stock and forex simulated instrument catalogue.
- [x] Synthetic local price movement and candle generation.
- [x] Canvas candlestick chart with timeframe aggregation controls.
- [x] Virtual cash and market order simulation.
- [x] Limit order lifecycle with local price-trigger matching.
- [x] Virtual positions, average cost, trading fees and P/L.
- [x] Watchlist, open orders, trade history and portfolio views.
- [x] IndexedDB persistence with atomic multi-store snapshots and periodic autosave.
- [x] PWA manifest and Service Worker application-shell cache.
- [x] Capacitor 8 project configuration and web bundle preparation script.
- [x] Android build documentation and validation workflow.
- [ ] Android native project generated and built.
- [ ] Physical Android device testing and airplane-mode validation.
- [ ] Export/import backup and restore.
- [ ] Formal functional tests for order engine and ledger invariants.
- [ ] Professional chart indicators and drawing tools.
- [ ] Android launcher/adaptive icon and splash assets.
- [ ] Google Play privacy disclosures, signed AAB and internal testing.

## Stage 1 — Stabilize the offline terminal

- [x] Remove old product modules from active UI and navigation.
- [x] Keep legacy data and infrastructure untouched.
- [x] Add a local-first application data layer.
- [ ] Test order edge cases, limit order reservations, fees, precision and reset behavior.
- [ ] Add recovery handling for quota exhaustion and corrupted local storage.

## Stage 2 — Complete simulation and charting

- [x] Local synthetic price feed for Crypto, Stocks and Forex.
- [x] Candlestick rendering and initial timeframe aggregation.
- [ ] Add EMA/SMA/RSI/MACD indicators.
- [ ] Add chart crosshair, price scale, zoom and drawing tools.
- [ ] Improve timeframe-specific history depth and chart performance.
- [ ] Add deterministic seeded scenarios for repeatable testing.

## Stage 3 — Offline data resilience

- [x] IndexedDB persistence for settings, watchlist, candles, orders, positions and trades.
- [x] Atomic snapshot persistence.
- [x] Service Worker cache for static app shell.
- [ ] Add export/import backup with schema versioning and validation.
- [ ] Add storage health, quota warning and recovery UX.
- [ ] Verify persistence through browser restarts and Android process termination.

## Stage 4 — Android application

- [x] Capacitor 8.6.0 dependencies and configuration.
- [x] Build script to prepare the shared web bundle.
- [ ] Generate native Android project.
- [ ] Configure and verify target SDK 36 or current Play requirement at submission.
- [ ] Generate launcher/adaptive icons and splash assets.
- [ ] Validate back navigation, status bar, keyboard, safe areas and lifecycle.
- [ ] Build and sign Android App Bundle.
- [ ] Run physical-device and airplane-mode tests.

## Stage 5 — Release quality

- [x] Static syntax and bundle validation workflow defined.
- [ ] Add unit tests for cash, position, fee, order and P/L invariants.
- [ ] Browser smoke tests for all desktop/mobile views.
- [ ] Accessibility and performance checks.
- [ ] Privacy policy and Play Data safety declarations.
- [ ] Internal testing and release review.

## Future scope — only after explicit product decision

- Online market data.
- Cloud backup and cross-device sync.
- Broker/exchange integrations and real-money trading.

These future features are not part of Release 1.0. Real-money execution must remain disabled.
