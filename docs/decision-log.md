# LeadRescue AI Decision Log

This file records implemented or explicitly approved decisions that materially affect release, security, architecture, or commercial readiness. It does not replace the Project MASTER CURRENT STATE.

## 2026-08-22 - Supabase Dev foundation and controlled authentication slice

**Status:** IN PROGRESS. Database and tenant-RLS foundation are VERIFIED IN DEV. Authentication code is IMPLEMENTED ON DRAFT PR #10 and has passed CI, but Preview runtime configuration and end-to-end auth validation remain REQUIRES VERIFICATION.

### Decision

Use Supabase as the minimum approved backend foundation for LeadRescue authentication and tenant-aware shared persistence work. Introduce it through controlled development before any Production promotion.

The first authentication slice is intentionally sign-in only. Do not enable public self-signup until account provisioning, organization membership, role assignment, lifecycle, and recovery behavior are explicitly approved and tested.

### Verified Dev foundation

- Hosted Supabase project `LeadRescue AI Dev` is active.
- Versioned migrations create organizations, profiles, organization memberships, contacts, leads, lead events, and follow-up tasks.
- Tenant-aware foreign keys and Row Level Security are enabled for the public application tables.
- Hosted Dev contains the same three migration versions committed under `supabase/migrations`.
- Supabase Security Advisors returned no security lints at the latest check.
- PR #8 versioned the hosted Dev schema and tenant isolation tests into the repository.
- PR #9 added local Supabase database testing to CI and merged into `develop`.
- The hosted Dev Auth user count was `0` at the latest direct check, so no login flow has yet been validated with a real test account.

### Authentication implementation on draft PR #10

- Uses official `@supabase/ssr` and `@supabase/supabase-js` packages.
- Uses public Supabase URL and publishable-key environment variables only for browser-safe configuration.
- Adds browser and server Supabase clients with fail-closed configuration handling.
- Adds request-level session refresh through Next.js Proxy.
- Uses `supabase.auth.getClaims()` for protected server access rather than trusting an unverified cookie session object.
- Adds a password sign-in page and server action.
- Protects the LeadRescue workspace route and redirects unauthenticated users to sign in.
- Adds server-side sign-out.
- Keeps public self-signup disabled.
- Keeps the existing demo access-code gate on the AI enhancement route as a separate cost-control layer.
- Adds focused authentication and configuration tests.
- GitHub Actions CI run #33 passed on commit `c6826d65789bc0ad0d289ca89a386eaacd7e9f47`.
- Vercel created a Ready Preview deployment for the same draft PR, but Supabase Preview environment configuration and runtime auth behavior are not yet established.

### Deliberately unchanged

- No Production Supabase database or Production auth configuration has been approved or deployed.
- The current application still uses browser-local workspace persistence. No application lead reads or writes have been moved to Supabase yet.
- `/api/enhance-lead` still requires the existing demo access code and has not yet been converted to authenticated-user authorization.
- No automatic organization provisioning or public customer onboarding exists.
- No Meta, Google, WhatsApp, voice, billing, booking, CRM, or other provider integration is added by this change.

### Required validation before promotion

1. Configure the two public Supabase environment values in the Vercel Preview environment without exposing secrets in Git.
2. Create one controlled non-production Auth user using a supported Supabase Auth path.
3. Create that user's profile and organization membership through an approved provisioning path.
4. Verify sign-in, sign-out, expired-session refresh, and unauthenticated redirects on Preview.
5. Verify tenant RLS allows the test user to access only its organization data.
6. Decide and implement authenticated authorization for server APIs before real-client pilot use.
7. Keep PR #10 draft until the Preview checks pass and the change is approved for merge to `develop`.

### Master Current State delta

The Master statement that Supabase is only proposed is now superseded for the controlled Dev foundation. Supabase is implemented and verified in Dev at the database/RLS layer, and application authentication is in controlled draft integration. Production authentication, Production persistence, operational tenancy, and client-ready SaaS maturity remain NOT ESTABLISHED.

## 2026-08-21 - Security baseline and release governance

**Status:** IMPLEMENTED and VERIFIED CURRENT

### Decision

Adopt a controlled GitHub release path for LeadRescue AI:

1. Work is prepared and validated away from `main`.
2. Changes are promoted through pull requests.
3. GitHub Actions CI runs the repository verification suite.
4. `main` is protected against direct unsafe release changes.
5. Production remains tied to Vercel deployments from `main`.

### Implemented state

- Repository: `nileshsshirishkar/leadrescue-ai`.
- Production branch: `main`.
- Development branch: `develop`.
- Vercel Production tracks `main`.
- Security dependency baseline promoted to Production in merge commit `3b78d8a669b9177f41177d0e62f8dcd4d9701ade`.
- Next.js updated from `16.2.10` to `16.3.1`.
- `eslint-config-next` updated from `16.2.10` to `16.3.1`.
- Patched transitive dependencies are captured in `package-lock.json`.
- GitHub Actions workflow exists at `.github/workflows/ci.yml`.
- CI job name: `Verify`.
- CI runs `npm ci`, lint, typecheck, tests, and build.
- CI smoke-test PR #3 completed successfully. GitHub Actions run `32410390488` passed every `Verify` step.
- `main` is protected by the active ruleset `Protect main`.
- The ruleset requires a pull request before merging, conversation resolution before merging, blocks force pushes, restricts branch deletion, and requires the GitHub Actions `Verify` status check.
- Required approvals remain `0` at the current solo-development stage.
- Vercel deployment for production commit `3b78d8a669b9177f41177d0e62f8dcd4d9701ade` completed successfully.
- Production smoke check passed on `https://leadrescue-ai-eosin.vercel.app`.

### Verification evidence

Before production promotion, the security branch passed:

- `npm run lint`
- `npm run typecheck`
- `npm test` with 43 passing tests
- `npm run build`
- `npm audit --omit=dev` with 0 vulnerabilities at validation time
- `npm audit` with 0 vulnerabilities at validation time
- Vercel Preview deployment
- Visual preview smoke check

After production promotion:

- GitHub confirmed `main` at commit `3b78d8a669b9177f41177d0e62f8dcd4d9701ade`.
- Vercel status for that commit returned success.
- Visual Production smoke check passed.
- GitHub confirmed `main` is protected.
- The required `Verify` check was selected in the saved `Protect main` ruleset.

### Scope limits

This decision does **not** upgrade LeadRescue AI to production-ready multi-user SaaS status. The current application remains the controlled Phase 2 prototype unless later verified evidence changes that classification.

The following remain unimplemented or unverified as production capabilities unless separately proven:

- user authentication and authorization
- tenant isolation
- production database and shared persistence
- server-side rate limiting and shared idempotency
- billing and payments
- Meta or Google lead ingestion
- CRM synchronization
- WhatsApp automation
- voice AI
- booking integrations
- background workers or infrastructure queues
- application monitoring and alerting
- backup and recovery for lead data

Zoho CRM sync remains excluded unless explicitly reversed by an approved decision.

### Superseded audit findings

The earlier production architecture audit correctly described the code prototype at the time, but the following findings are now superseded by direct current evidence:

- GitHub repository identity and accessibility are now verified.
- `main` and `develop` branches are verified.
- Vercel linkage and Production branch mapping are verified.
- GitHub Actions CI is now implemented and verified working.
- `main` branch protection is now implemented.
- Production deployment commit mapping is now verified.
- The current verified production hostname is `leadrescue-ai-eosin.vercel.app`.

The earlier audit findings about browser-local application architecture, absence of database/authentication/integrations, and controlled prototype maturity remain current unless later implementation evidence supersedes them.

### Master Current State delta

The Project MASTER CURRENT STATE should be updated to record this release-governance and security change and to remove or supersede any statement that says GitHub identity, Vercel linkage, CI, branch protection, or Production deployment SHA are unknown.

It should also continue to state that `leadrescue.online` is not a verified user-owned or attached LeadRescue production domain.

## 2026-08-21 - Keep repository public while on GitHub Free

**Status:** APPROVED CURRENT DECISION

### Decision

Keep `nileshsshirishkar/leadrescue-ai` public while the repository is operated on GitHub Free. Reconsider private visibility before commercial code, proprietary assets, or real client data materially expand, and only after a protection path for a private repository is confirmed.

### Reason

Current GitHub documentation states that repository rulesets are available for public repositories on GitHub Free, while rulesets for private repositories require GitHub Pro, GitHub Team, or GitHub Enterprise Cloud. Protected branches have the same public-Free versus private-paid plan boundary. The current `Protect main` ruleset and required `Verify` workflow are material release controls, so making the repository private now could remove or weaken the protection model unless the GitHub plan is upgraded first.

### Current controls and constraints

- Repository visibility remains public.
- `Protect main` remains the controlling release ruleset.
- Pull requests and the `Verify` status check remain required for `main`.
- No secrets, credentials, private client data, proprietary datasets, or sensitive configuration may be committed to the public repository.
- Repository visibility must be reviewed again before real client data or materially sensitive commercial code/assets are introduced.
- A future switch to private should be preceded by verification that the selected GitHub plan supports the required ruleset/protected-branch controls.

### Evidence

- GitHub repository state is currently public.
- User confirmed the account is on GitHub Free.
- GitHub official documentation checked 21 August 2026 states that rulesets are available on public repositories with GitHub Free and on public/private repositories with GitHub Pro, Team, or Enterprise Cloud.
- GitHub official protected-branch documentation checked 21 August 2026 states that protected branches are available on public repositories with GitHub Free and on private repositories with GitHub Pro, Team, Enterprise Cloud, or Enterprise Server.

### Master Current State delta

The Master item asking whether the repository should remain public is now resolved for the current stage: **KEEP PUBLIC WHILE ON GITHUB FREE**. This is a temporary governance decision, not a permanent commitment to public source. Re-open the decision before commercial sensitivity or real client data increases, or when the GitHub plan changes.
