# MEMEVERSE

**MEMEVERSE — Enter the Internet's Financial Universe.**

MEMEVERSE is a Web3-inspired social, community, messaging, memecoin, and multi-market terminal platform. This repository is under active staged development. It is not yet a production-ready exchange or complete social platform.

## Current architecture
- Frontend: vanilla HTML, CSS, and JavaScript.
- Hosting: Vercel.
- Backend: Supabase Auth, PostgreSQL, Storage, Realtime, and Edge Functions.
- Canonical backend: the Supabase project named MEMEVERSE.
- Development baseline: work/memeverse-platform-completion, based on feature/stage-2-x-network.

## Current implementation
- Email/password authentication, session restoration, password recovery, and profile editing.
- Public player profiles with private birthday storage and profile-media uploads.
- Database-backed X feed, following feed, likes, reposts, replies, follows, and bookmarks.
- Realtime subscription for new X posts.
- USDV simulated-credit wallet, ledger, and server-side simulated crypto market-order path for four crypto symbols.
- Vercel static deployment and basic GitHub Actions JavaScript/config validation.

## Not production complete
MEMEVERSE Pump, Messenger, Community, and the full Trading Terminal are not complete. Current Pump, Messenger, and Community screens contain demo or placeholder behavior. USDV is simulated development credit only. The trading backend does not execute real-money or blockchain transactions. Market data coverage is limited and must not be represented as a complete live multi-market terminal.

A separate legacy Supabase project named X-Network contains an older X identity/schema. It is documented as legacy and must not be merged directly into the primary app without migration work.

## Documentation
- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Database schema](docs/DATABASE_SCHEMA.md)
- [Security](docs/SECURITY.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Testing](docs/TESTING.md)
- [Changelog](docs/CHANGELOG.md)
- [Known issues](docs/KNOWN_ISSUES.md)

## Local development
The frontend is static. Serve the repository root with any local static HTTP server. Configure supabase-config.js with the primary Supabase project URL and browser-safe publishable/anon key. Never put a Supabase service-role or secret key in browser code.

Before public signup, verify Supabase Auth redirect URLs, email confirmation, SMTP, RLS, Storage policies, and preview/production domain configuration.

## Release policy
Changes are developed on feature/work branches and reviewed through pull requests. Existing open PRs are preserved. No destructive database migration, PR merge, real-money integration, or production deployment should occur without explicit approval.

See [docs/ROADMAP.md](docs/ROADMAP.md) for the staged implementation plan.
