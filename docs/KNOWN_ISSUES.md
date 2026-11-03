# Known Issues and Unresolved Limitations

Snapshot: 2026-11-03.

## Architecture
- Two active Supabase projects contain separate X identity models.
- Legacy sharing/mentions uses bigint post IDs and x_profiles; primary MEMEVERSE uses UUID post IDs and profiles. Direct merge is incompatible.
- Vercel reports live=false; latest deployment is READY but non-production. Preview may require SSO.

## Social
- Feed loads at most 50 posts; no cursor pagination.
- Realtime listens for new x_posts inserts only.
- No primary-schema post media, editing, quote posts, sharing/mentions, search, trending, notifications, reports, or moderation.
- Profile counts and profile timeline require live-data verification.

## Messenger and Community
- Main app Messenger screen is a placeholder.
- Legacy x_messages supports basic direct sender/recipient rows only; no group conversation or attachment workflow.
- Community/server creation is browser-local demo behavior, not persisted or permissioned.

## Pump
- Token creation is local in-memory demo state.
- No token database, bonding curve, token trade ledger, holder distribution, chart, or creator portfolio.
- No blockchain integration is configured.

## Trading terminal
- Existing backend supports simulated USDV market trades for BTCUSDT, ETHUSDT, SOLUSDT, and BNBUSDT only.
- No stock/forex provider, candlestick history, order book, limit orders, watchlists, or alert service.
- Edge Function hardening and decimal precision require additional review.
- USDV is development credit only, not real money or a redeemable stablecoin.

## Security and operations
- Leaked-password protection is disabled in both Supabase projects.
- Primary DB has excess anon table grants on profile-related tables; RLS currently constrains access but least-privilege grants should be tightened.
- Performance Advisor reports 14 primary-project RLS auth-initplan findings and unused-index informational findings.
- No automated browser E2E suite was found.
- Production SMTP, canonical Auth redirects, public domain, backup/restore drills, and launch monitoring remain to be verified.
