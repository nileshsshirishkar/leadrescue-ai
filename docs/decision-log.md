# LeadRescue AI Decision Log

This file records implemented or explicitly approved decisions that materially affect release, security, architecture, or commercial readiness. It does not replace the Project MASTER CURRENT STATE.

## 2026-08-22 - Supabase Dev foundation and controlled authentication slice

**Status:** IN PROGRESS. Database and tenant-RLS foundation are VERIFIED IN DEV. Authentication code is IMPLEMENTED ON DRAFT PR #10 and has passed repository CI. Preview runtime configuration and end-to-end authentication remain REQUIRES VERIFICATION.

### Decision

Use Supabase as the minimum approved backend foundation for LeadRescue authentication and tenant-aware shared persistence work. Introduce it through controlled development before any Production promotion.

The first authentication slice is sign-in only. Public self-signup stays disabled until account provisioning, organization membership, role assignment, lifecycle, and recovery behavior are explicitly approved and tested.

### Verified Dev foundation

- Hosted Supabase project `LeadRescue AI Dev` is active.
- Versioned migrations create organizations, profiles, organization memberships, contacts, leads, lead events, and follow-up tasks.
- Tenant-aware foreign keys and Row Level Security are enabled for the public application tables.
- Hosted Dev contains the same three migration versions committed under `supabase/migrations`.
- Supabase Security Advisors returned no security lints at the latest check.
- PR #8 versioned the hosted Dev schema and tenant-isolation tests into the repository.
- PR #9 added local Supabase database testing to CI and merged into `develop`.
- Hosted Dev Auth user count was `0` at the latest direct check, so login has not yet been validated with a real test account.

### Authentication implementation on draft PR #10

- Uses official `@supabase/ssr` and `@supabase/supabase-js` packages.
- Uses public Supabase URL and publishable-key environment variables only for browser-safe configuration.
- Adds fail-closed configuration handling plus browser and server Supabase clients.
- Adds request-level session refresh through Next.js Proxy.
- Uses `supabase.auth.getClaims()` for protected server access.
- Adds password sign-in, protected workspace routing, and server-side sign-out.
- Keeps public self-signup disabled.
- Requires an authenticated Supabase user before `/api/enhance-lead` reads AI configuration or invokes the model.
- Keeps the existing demo access-code check as an additional AI cost-control layer after authentication.
- Adds focused authentication/configuration tests and an unauthenticated API rejection test.
- GitHub Actions CI run #37 passed on implementation commit `557e6b71eb25ef5b2ce9d4babbce7ef1635ca72c`.
- Vercel has created Ready Preview deployments for the draft PR, but Supabase Preview environment configuration and runtime auth behavior are not yet established.

### Deliberately unchanged

- No Production Supabase database or Production auth configuration has been approved or deployed.
- The application still uses browser-local workspace persistence. Lead reads and writes have not moved to Supabase.
- The demo access-code cost guard remains in place for AI enhancement.
- No automatic organization provisioning or public customer onboarding exists.
- No Meta, Google, WhatsApp, voice, billing, booking, CRM, or other provider integration is added by this change.

### Required validation before promotion

1. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the Vercel Preview environment without committing values to Git.
2. Create one controlled non-production Auth user through a supported Supabase Auth path.
3. Create that user's profile and organization membership through an approved provisioning path.
4. Verify sign-in, sign-out, expired-session refresh, unauthenticated redirects, and authenticated `/api/enhance-lead` behavior on Preview.
5. Verify tenant RLS allows the test user to access only its organization data.
6. Keep PR #10 draft until Preview checks pass and the change is approved for merge to `develop`.

### Master Current State delta

The Master statement that Supabase is only proposed is superseded for the controlled Dev foundation. Supabase is implemented and verified in Dev at the database/RLS layer, and application authentication is in controlled draft integration. Production authentication, Production persistence, operational tenancy, and client-ready SaaS maturity remain NOT ESTABLISHED.

## 2026-08-21 - Security baseline and release governance

**Status:** IMPLEMENTED and VERIFIED CURRENT

### Decision

Use a controlled GitHub release path:

1. Work and validation happen away from `main`.
2. Changes are promoted through pull requests.
3. GitHub Actions CI runs the repository verification suite.
4. `main` remains protected against direct unsafe release changes.
5. Vercel Production remains tied to `main`.

### Current controls

- Repository: `nileshsshirishkar/leadrescue-ai`.
- Development branch: `develop`.
- Production branch: `main`.
- GitHub Actions workflow: `.github/workflows/ci.yml`.
- Required CI job: `Verify`, running install, lint, typecheck, tests, and build.
- Active `Protect main` ruleset requires a pull request and the `Verify` status check, requires conversation resolution, blocks force pushes, and restricts branch deletion.
- Required approvals remain `0` at the solo-development stage.
- Vercel Production tracks `main`.
- Verified public production hostname remains `https://leadrescue-ai-eosin.vercel.app` unless newer direct deployment evidence proves a change.

### Scope limit

Release governance does not make LeadRescue a production-ready multi-user SaaS. Production authentication, tenant persistence, monitoring, backups, billing, provider integrations, customer traction, revenue, and ROI proof require separate verification.

Zoho CRM sync remains excluded unless explicitly reversed by an approved decision.

## 2026-08-21 - Keep repository public while on GitHub Free

**Status:** APPROVED CURRENT DECISION

### Decision

Keep `nileshsshirishkar/leadrescue-ai` public while the repository is operated on GitHub Free. Reconsider private visibility before commercial code, proprietary assets, or real client data materially expand, and only after a protection path for a private repository is confirmed.

### Reason and controls

At the time of verification, GitHub documentation supported the required ruleset/protected-branch controls for public repositories on GitHub Free, while equivalent private-repository controls required a paid plan. Therefore:

- repository visibility remains public for the current stage;
- `Protect main`, pull requests, and required `Verify` remain the release controls;
- no secrets, credentials, private client data, proprietary datasets, or sensitive configuration may be committed;
- visibility must be reviewed before real client data or materially sensitive commercial code/assets are introduced, or when the GitHub plan changes.

### Master Current State delta

The prior open question about current repository visibility is resolved for this stage: KEEP PUBLIC WHILE ON GITHUB FREE. This is a temporary governance decision, not a permanent commitment to public source.
