# MEMEVERSE backend foundation

## Status
This repository now includes the first Supabase migration for player identity,
virtual USDV wallets, a server-created starter grant, an append-only ledger,
and a minimal X-style public feed.

This is a foundation, not a complete multiplayer backend. Wallet mutation,
token trading, marketplace escrow, private messaging, moderation, and realtime
presence are intentionally not exposed yet.

## Create a Supabase project
1. Create a new Supabase project.
2. Keep the database password private.
3. Copy the Project URL and anon/public key into your local environment file.
4. Never put the service-role key in browser code or commit it to Git.

## Apply the migration
Install the Supabase CLI, link the project, then run:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Alternatively, review and run
`supabase/migrations/202611020001_initial_foundation.sql` in the Supabase SQL
Editor of a fresh development project.

## Current data model
- `profiles`: public player identity.
- `wallets`: private USDV balance, readable only by its owner.
- `ledger_entries`: private append-only accounting history, readable only by its owner.
- `x_posts`: public demo social feed.
- `x_follows`: player follow relationships.
- `x_likes`: player likes.

New Supabase Auth users receive a generated handle and a one-time 10,000 USDV
starter grant through a database trigger.

## Security rules
- Do not add client-side wallet or ledger write policies.
- All balance-changing operations must be implemented as trusted server-side
  database functions or Edge Functions with authorization, validation, and
  atomic transactions.
- Keep service-role credentials server-side only.
- Review RLS policies before adding DMs, private groups, or marketplace orders.
- Add rate limits, abuse controls, audit logs, and tests before public launch.

## Frontend environment
Copy `.env.example` to `.env.local` and fill in the Supabase URL and anon key.
The existing static prototype does not yet consume these variables; frontend
authentication integration is the next implementation milestone.

## Important
USDV is fictional in-game currency. No real deposits, withdrawals, crypto
wallets, securities, or real-money trading are implemented by this migration.
