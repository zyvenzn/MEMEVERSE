# MEMEVERSE Roadmap

Status snapshot: 2026-11-03. Completion markers reflect inspected code or live metadata, not the original feature wish list.

## Stage 0 — Audit and stabilization
- [x] Inspect repository, branches, open PRs, both Supabase projects, migrations, advisors, Realtime, Storage, Edge Function, and Vercel deployment.
- [ ] Reconcile primary and legacy X identity/schema.
- [ ] Add repeatable local/static validation and browser smoke tests.

## Stage 1 — Foundation
- [x] Supabase email/password signup, sign-in, session restoration, sign-out, password recovery, and password update UI.
- [x] Profile editing and private birthday storage.
- [x] RLS enabled on all 11 audited primary public tables.
- [x] Header USDV balance reads the authenticated user's persisted wallet rather than local demo state.
- [ ] Verify Auth redirects, email confirmation, and production SMTP.
- [ ] Tighten excess anon table grants and optimize remaining RLS policy expressions.

## Stage 2 — Social
- [x] Database-backed posts, For You/Following feeds, likes, reposts, replies, follows, and bookmarks.
- [x] Profile editor with avatar/banner uploads.
- [x] Realtime subscription for new posts.
- [ ] Port sharing and mentions from the legacy branch to the primary schema.
- [ ] Add media posts, post editing/deletion UI, quote posts, reply threads, profile timelines, search, trending, notifications, reports, and moderation.
- [ ] Add cursor pagination and realtime reconciliation.
- [ ] Verify two-account workflows on desktop and mobile.

## Stage 3 — Pump
- [ ] Specify and test deterministic bonding curve and fee model.
- [ ] Add token metadata, creator identity, storage, token lifecycle, holders, and trade tables.
- [ ] Implement atomic simulated-credit buys/sells and immutable token ledger.
- [ ] Add charts, portfolios, history, discovery, and anti-abuse controls.
- [ ] Keep simulated tokens separate from terminal market assets.
- [ ] Consider blockchain adapter only after explicit scope/security approval.

## Stage 4 — Messenger
- [ ] Canonical conversations, participants, messages, attachments, read states, and blocking.
- [ ] Secure direct and group messaging, realtime, typing/presence, unread counts, uploads, notifications, and abuse controls.

## Stage 5 — Community
- [ ] Communities, channels, membership, roles, permissions, and invitations.
- [ ] Realtime text channels, discovery, member lists, moderation, bans, kicks, mutes, and reports.
- [ ] Voice remains unavailable until actual voice infrastructure is integrated.

## Stage 6 — Trading terminal
- [x] Simulated USDV wallet, ledger, trade history, and server-side market-order path for four crypto symbols.
- [ ] Harden decimal input, idempotency, timeouts, and rate limits.
- [ ] Add provider-backed crypto charts/order book/market statistics.
- [ ] Integrate licensed stock and FX providers.
- [ ] Add watchlists, alerts, order history, positions, and limit-order simulation.
- [ ] Keep real-money execution disabled.

## Stage 7 — Unified ecosystem
- [ ] One canonical profile/session, notification inbox, account settings, routing, navigation, and design system.

## Stage 8 — QA and release
- [ ] Unit, integration, browser, RLS, concurrency, ledger reconciliation, responsive, and accessibility tests.
- [ ] Resolve critical/high issues and document accepted limitations.
- [ ] Verify production Auth, SMTP, domain, environment, Storage, backups, monitoring, and incident procedures.
- [ ] Production deployment requires explicit owner approval.
