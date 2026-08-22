# LeadRescue AI Decision Log

This file records implemented or explicitly approved decisions that materially affect release, security, architecture, or commercial readiness. It does not replace the Project MASTER CURRENT STATE.

## 2026-08-22 - Read-only tenant organization context

**Status:** IMPLEMENTED AND VERIFIED IN PREVIEW on PR #11. Production persistence and application lead reads/writes remain NOT IMPLEMENTED.

### Decision

Introduce Supabase application persistence in the smallest safe order. The first persistence slice resolves the authenticated user's organization context only. It is read-only and must fail closed when tenant context is missing, malformed, unavailable, or ambiguous.

Do not silently choose an organization when a user belongs to more than one organization. Multi-organization selection requires a separate approved design.

### Implementation

- Added a server-side organization-context resolver using the existing Supabase SSR server client.
- Identity is verified with `supabase.auth.getClaims()` before tenant lookup.
- Membership lookup explicitly filters `organization_members.user_id` to the authenticated user and limits results to detect ambiguous multi-organization membership.
- Organization lookup explicitly filters by the resolved `organization_id`.
- Returned membership and organization rows are schema-validated before use.
- Missing membership returns a fail-closed access state.
- Multiple memberships return an explicit organization-selection-required state rather than choosing a row.
- Database errors, malformed rows, and inconsistent organization results fail closed.
- Added read-only `GET /api/organization-context` with `Cache-Control: private, no-store`.
- No database migration, contact write, lead write, event write, task write, or localStorage migration is included.

### Verification

- GitHub Actions CI run #42 passed `Verify`, including install, lint, typecheck, tests, and build.
- CI run #42 passed `Database Tests`, including local Supabase startup and pgTAP tenant tests.
- Vercel Preview deployment `dpl_2YSvKeCXujRmRU2beTgxnuRv58df` was READY on PR #11 head `2326eb27c8537a20f41b47e8bf54e52af2d4239b` before this documentation update.
- Signed-out Preview request to `/api/organization-context` returned `401 Authentication required.` with private/no-store caching.
- Signed-in controlled user request returned HTTP 200 and only the `LeadRescue QA` organization with slug `leadrescue-qa` and role `owner`.
- Vercel runtime logs independently recorded the authenticated `/api/organization-context` request as HTTP 200 on the PR #11 Preview deployment.
- A controlled transaction created an unrelated temporary organization, simulated the authenticated controlled user, and confirmed RLS exposed only `LeadRescue QA` plus that user's single owner membership. The transaction was rolled back.
- Focused resolver tests cover unauthenticated access, no membership, multiple memberships, malformed rows, missing organization lookup, and dependency/database failure.

### Safety boundary

- RLS remains the database security boundary. Explicit application query filters are additional defense and performance controls, not a replacement for RLS.
- Browser-local lead workspace persistence remains unchanged.
- Production Supabase authentication and Production persistence remain unimplemented.
- No public signup, automatic organization provisioning, customer onboarding, Meta/Google ingestion, CRM sync, WhatsApp, voice, billing, booking, or other provider integration is introduced.

### Promotion decision

PR #11 is eligible for merge into `develop` after the documentation-update commit passes CI. Do not merge this milestone to `main` or make Production Supabase changes.

### Master Current State delta

The Master should classify authenticated tenant organization-context resolution as IMPLEMENTED AND VERIFIED IN PREVIEW / DEVELOP once PR #11 merges. Supabase-backed lead/contact/task persistence, Production authentication, Production database usage, multi-organization selection, and customer-ready multi-tenant application operation remain NOT ESTABLISHED.

## 2026-08-22 - Supabase Dev foundation and controlled authentication slice

**Status:** IMPLEMENTED AND VERIFIED IN PREVIEW for the controlled sign-in slice. Database and tenant-RLS foundation are VERIFIED IN DEV. Production authentication and Production persistence remain NOT IMPLEMENTED.

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
- One controlled confirmed non-production Auth user now exists with a `LeadRescue QA` organization, profile, and owner membership.

### Authentication implementation and Preview validation on PR #10

- Uses official `@supabase/ssr` and `@supabase/supabase-js` packages.
- Uses public Supabase URL and publishable-key environment variables only for browser-safe configuration.
- Adds fail-closed configuration handling plus browser and server Supabase clients.
- Adds request-level session refresh through Next.js Proxy.
- Uses `supabase.auth.getClaims()` for protected server access.
- Applies Supabase-provided cache headers when refreshed authentication cookies are written by the Proxy.
- Adds password sign-in, protected workspace routing, and server-side sign-out.
- Keeps public self-signup disabled.
- Requires an authenticated Supabase user before `/api/enhance-lead` reads AI configuration or invokes the model.
- Keeps the existing demo access-code check as an additional AI cost-control layer after authentication.
- Adds focused authentication/configuration tests and an unauthenticated API rejection test.
- Preview Supabase environment configuration is active.
- Correct email/password sign-in passed in Preview.
- Wrong-password rejection passed and leaves the user on `/login`.
- Protected workspace access passed.
- Authenticated session survived browser refresh before and after the cache-header correction.
- Server-side sign-out passed and signed-out workspace access returned to `/login`.
- Tenant RLS isolation probe allowed the controlled user to see only its organization.
- Unauthenticated `/api/enhance-lead` returned `401 Authentication required.`.
- Authenticated `/api/enhance-lead` without the demo code returned `401 Demo access required.`.
- Authenticated `/api/enhance-lead` with the valid demo code returned `200` with a schema-valid GPT-5.6 enhancement.
- GitHub Actions CI run #39 passed on commit `e50f2354bbd6f32de29e47ab392ecd80771be85c` after the Supabase cache-header correction.
- Matching Vercel Preview deployment was READY and the unauthenticated response carried private/no-store cache controls.
- PR #10 subsequently passed final CI and merged into `develop` as merge commit `18a645f1880ef25039afda17e51885a74a6d8170`.

### Remaining validation boundary

- An actually expired access token has not been deliberately forced in Preview, so refresh-token rotation is not separately claimed as runtime-proven.
- This remains a required explicit validation item before Production promotion.

### Deliberately unchanged

- No Production Supabase database or Production auth configuration has been approved or deployed.
- The application still uses browser-local workspace persistence. Lead reads and writes have not moved to Supabase.
- The demo access-code cost guard remains in place for AI enhancement.
- No automatic organization provisioning or public customer onboarding exists.
- No Meta, Google, WhatsApp, voice, billing, booking, CRM, or other provider integration is added by this change.

### Promotion decision

The controlled authentication slice was merged into `develop` only. Do not merge it to `main` or configure Production Supabase authentication without a separate approved Production promotion.

### Master Current State delta

The Master should classify Supabase authentication as IMPLEMENTED AND VERIFIED IN PREVIEW and merged into `develop` for the controlled sign-in slice, with the database/RLS foundation VERIFIED IN DEV. Production authentication, Production persistence, operational multi-tenant application reads/writes, customer onboarding, and client-ready SaaS maturity remain NOT ESTABLISHED.

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
