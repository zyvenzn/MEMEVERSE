# Changelog

## 2026-11-03 — Audit baseline
- Inspected repository metadata, branch topology, and open PRs #1–#7.
- Created work/memeverse-platform-completion from feature/stage-2-x-network.
- Inspected primary and legacy Supabase projects, RLS coverage, migration history, advisors, Realtime, Storage, and trade Edge Function.
- Inspected Vercel project and latest Stage 2 deployment.
- Documented architecture, schema, security findings, deployment, testing, roadmap, and known issues.
- No production deployment, destructive database operation, PR merge, or credential change performed.

## 2026-11-03 — Wallet display integrity
- Changed the global balance header to load the signed-in user's USDV balance from the primary Supabase wallets table.
- Anonymous sessions now see a sign-in prompt instead of a hardcoded $10,000 balance.
- Kept local sandbox credits separate and explicitly labeled as demo-only.
- Added the work/** branch pattern to GitHub Actions push validation.
