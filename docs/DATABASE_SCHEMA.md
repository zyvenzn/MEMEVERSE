# Database Schema — Audit Baseline

Audit date: 2026-11-03.

## Primary MEMEVERSE project
Project: MEMEVERSE / whgryvzbafwvyoiyujzf / eu-west-2. PostgreSQL 17.11. The live database reports 11 public tables and RLS enabled on all 11.

| Table | Observed purpose |
|---|---|
| profiles | Canonical public user profile |
| profile_private | Owner-only full birthday |
| wallets | USDV simulated-credit balance, numeric and non-negative |
| ledger_entries | Balance history with numeric amount and constrained entry type |
| trading_trades | Simulated crypto trade history and unique request ID |
| x_posts | Social posts, UUID primary key |
| x_follows | Follow graph |
| x_likes | Like relations |
| x_replies | Replies attached to posts |
| x_reposts | Repost relations |
| x_bookmarks | Owner-scoped bookmarks |

Applied migration history includes profile extension/privacy, Stage 1 security/privacy, and Stage 2 bookmarks/realtime/index migrations.

Realtime: public.x_posts is in supabase_realtime.  
Storage: profile-media bucket exists; verify policies and upload constraints before launch.

Financial function: execute_virtual_trade is SECURITY DEFINER with an empty search_path. Direct EXECUTE is revoked from anon/authenticated. The swift-worker Edge Function validates the caller and calls this RPC.

## Legacy X-Network project
Project: X-Network / xyjypurmisfpikbgfxrx / ap-southeast-1. Eight public tables, all with RLS enabled:
- x_profiles
- x_posts (bigint IDs; incompatible with primary UUID IDs)
- x_likes
- x_reposts
- x_follows
- x_notifications
- x_messages
- x_mentions

This project has a separate Auth-linked X profile identity. Do not merge its migrations directly without rewriting foreign keys, IDs, ownership rules, and profile references.

## Schema gaps
No Pump token/bonding-curve/holder/trade tables in the primary schema. No canonical group conversation, community/server, channel, role, membership, or invitation tables. No primary-schema notifications, mentions, reports, post media, or quote-post relation tables. Terminal schema is limited to four crypto symbols and simulated USDV trades.
