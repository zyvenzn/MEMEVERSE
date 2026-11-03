# Testing Strategy and Current Evidence

## Current validation
- GitHub Actions workflow: .github/workflows/validate.yml.
- It runs node --check app.js and node --check supabase-config.js.
- It scans browser config for obvious service-role/secret-key patterns.
- Audited Stage 2 commit has a successful Vercel status and a READY deployment.
- No package manifest, unit-test framework, or browser E2E harness was found in the audited baseline.

## Not yet verified
- Browser signup/login/recovery with confirmation email.
- Profile save and upload with owner/non-owner accounts.
- Post, like, repost, reply, follow, bookmark, and realtime behavior with two accounts.
- RLS negative tests for anonymous and non-owner requests.
- Trading duplicate-request concurrency and balance/ledger reconciliation.
- Desktop/mobile behavior across browsers.
- Offline, rate-limit, and upstream provider failure handling.

## Required test layers
1. Static syntax, lint, HTML/CSS validation, dependency/security checks.
2. Database migration validation, RLS matrix, grants, constraints, indexes, triggers, and function permissions.
3. Integration tests for Auth, Storage, Realtime, Edge Function, and market provider.
4. Browser workflows for signup, profile, social, messaging, community, Pump, and terminal.
5. Responsive desktop/tablet/mobile, keyboard navigation, and screen-reader basics.
6. Financial invariants: ledger reconciles to wallet balance, no negative balance, idempotent requests, and no double-spend under concurrency.

A feature is not complete until acceptance tests pass and data persists after refresh.
