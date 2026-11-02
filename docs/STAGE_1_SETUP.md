# Stage 1 setup notes

## Supabase Auth

The browser app uses the project's publishable key in `supabase-config.js`. This key is intended for browser use; never put a `service_role` or Supabase secret key in this file.

Before inviting users:

1. In Supabase Dashboard, open **Authentication → URL Configuration**.
2. Set the Site URL to the canonical MEMEVERSE domain when one is chosen.
3. Add the exact Vercel preview URL used for testing to Redirect URLs. The current branch preview alias is:
   `https://memeverse-git-feature-stage-1-foundation-grem4.vercel.app/**`
4. Keep email confirmation enabled for public sign-ups and configure a reliable custom SMTP provider before launch.
5. In **Authentication → Security and Protection**, enable leaked-password protection.

The app supports email/password sign-up, sign-in, session restoration, sign-out, password-reset email, and setting a new password after the recovery link is opened.

## Birthday privacy

- `profiles.birthday_public` stores only `MM-DD` for optional public display.
- The full `DATE` value belongs in `profile_private.birthday`, which remains owner-restricted by RLS.
- Do not add a year back to the public profile field.

## Database function permissions

Direct `EXECUTE` was revoked from `PUBLIC`, `anon`, and `authenticated` for `public.handle_new_user()` and `public.rls_auto_enable()`. The existing auth-user trigger and PostgreSQL-owned trigger execution remain in place.

## Verification boundaries

- Vercel preview deployment reached `READY`; its target is not production.
- The repository is a vanilla HTML/CSS/JavaScript project and currently has no package manifest or established browser-test harness.
- The GitHub Actions workflow checks JavaScript syntax and prevents obvious server-only key patterns from entering the browser config.
- Supabase's leaked-password protection is still a dashboard-level action and must be enabled before public launch.
