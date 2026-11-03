# Deployment and Environment

## Current hosting
- Vercel project: memeverse.
- Git repository: zyvenzn/MEMEVERSE.
- Framework: none detected; static HTML/CSS/JavaScript.
- Latest audited Stage 2 deployment: READY at https://memeverse-6o2tb8do4-grem4.vercel.app.
- Branch: feature/stage-2-x-network.
- Commit: 4f2c5164f6aa2f65276155f84fa131be806995b8.
- Vercel metadata reports live=false; READY does not mean production.
- SSO protection is enabled for deployment URLs except configured custom domains; preview access may require Vercel authentication.

## Browser configuration
supabase-config.js contains the primary Supabase URL and browser publishable/anon key. Never add service_role, sb_secret_*, provider secrets, or signing secrets to browser code.

## Server-side configuration
The execute-trade Edge Function requires server-side Supabase URL, anon key, and service-role key. Never print or commit secret values.

## Before production
1. Select and verify canonical domain.
2. Configure Supabase Auth Site URL and exact Redirect URLs.
3. Configure custom SMTP and test email confirmation/password recovery.
4. Verify Storage CORS, policies, file-size/type limits, and bucket visibility.
5. Configure Vercel production branch and environment scopes deliberately.
6. Confirm deployment protection behavior for public domains.
7. Verify backups, monitoring, quotas, and restore plan.
8. Run QA and security acceptance tests.
9. Obtain explicit owner approval before production deployment.

No production deployment or production infrastructure change is authorized by this audit.
