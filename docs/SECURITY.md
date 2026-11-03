# Security Assessment and Controls

Audit date: 2026-11-03. This is a baseline assessment, not a production security certification.

## Existing controls
- Browser Supabase config points to the primary project and uses a browser publishable/anon key.
- No service-role credential was found in browser config.
- RLS is enabled on all 11 primary public tables and all 8 legacy X-Network public tables.
- Wallet and ledger client roles have no direct write privileges.
- The trade Edge Function validates the caller through Supabase Auth before invoking the privileged RPC.
- The trade RPC uses SECURITY DEFINER with an empty search_path; direct EXECUTE is revoked from anon/authenticated.
- Birthday data is split between public month/day and private full date.

## Findings
### High priority — least-privilege grants
The primary database grants anon table privileges on profile_private and broad privileges on profiles. RLS currently limits effective row access, but grants exceed the required public access model. Revoke unnecessary anon privileges through a reviewed additive migration after confirming required public profile reads.

### Medium priority — RLS performance
Supabase Performance Advisor reports 14 findings where auth.uid() may be re-evaluated per row. Replace with scalar subqueries such as (select auth.uid()) where semantically correct, then re-run advisors.

### Medium priority — Edge Function hardening
- CORS currently allows all origins; restrict to known application origins after canonical domains are selected.
- Add per-user rate limiting and request-size limits.
- Add quote-fetch timeout and upstream error classification.
- Validate decimal quantity strings without JavaScript floating-point round-tripping.
- Review concurrent duplicate-request idempotency.
- Do not log bearer tokens or private user data.

### Operational warning
Leaked-password protection is disabled on both Supabase projects. Enable it if the current plan supports it; otherwise document the limitation.

## Release controls
Test anonymous, owner, and non-owner access for every sensitive table and Storage bucket. Review SECURITY DEFINER functions, triggers, grants, and views. Keep secrets server-side. Add abuse reporting, throttling, moderation audit trails, monitoring, backups, and restore procedures. Do not enable real-money execution without a separate threat model, compliance review, custody/payment architecture, and explicit approval.
