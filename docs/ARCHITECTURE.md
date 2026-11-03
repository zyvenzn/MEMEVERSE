# MEMEVERSE Architecture — Audit Baseline

Audit date: 2026-11-03  
Working branch: work/memeverse-platform-completion  
Base commit: 4f2c5164f6aa2f65276155f84fa131be806995b8

## Current system
- Frontend: vanilla HTML, CSS, and JavaScript. Main entry points: index.html, app.js, style.css. No framework build step or package manifest was found in the audited branch.
- Hosting: Vercel static deployment.
- Identity and backend: Supabase Auth and PostgreSQL in the primary MEMEVERSE project (whgryvzbafwvyoiyujzf, eu-west-2).
- Browser config: supabase-config.js contains the primary project URL and browser publishable/anon key.
- Storage: profile-media bucket for profile media.
- Realtime: public.x_posts is published to supabase_realtime.
- Privileged operations: Edge Function execute-trade (slug swift-worker) validates a Supabase user token, obtains a Binance spot quote, and calls execute_virtual_trade.

## Parallel legacy X-Network project
A second active Supabase project named X-Network (xyjypurmisfpikbgfxrx, ap-southeast-1) contains a separate x_profiles identity, social tables, notifications, mentions, and a basic direct-message table. Its post IDs are bigint, while the primary MEMEVERSE x_posts IDs are UUID. The sharing/mentions PR targets this legacy schema and cannot be merged unchanged.

Direction: treat the primary MEMEVERSE project as canonical. Port only required legacy capabilities through reviewed additive migrations. Do not delete or reset the legacy project.

## Branch topology
PRs #1–#7 were open and unmerged at audit time. The most coherent application chain is feature/stage-1-foundation → feature/universe-responsive-dashboard → feature/stage-2-x-network. The older feature/x-sharing-mentions path diverges and uses the legacy X-Network project.

## Constraints
Preserve the vanilla frontend unless measured needs justify a migration. Keep service-role credentials server-side. USDV is simulated development credit, not a redeemable stablecoin. Pump-created tokens must remain separate from terminal market assets.
