# LeadRescue AI Decision Log

This file records implemented or explicitly approved decisions that materially affect release, security, architecture, or commercial readiness. It does not replace the Project MASTER CURRENT STATE.

## 2026-08-24 - Atomic imported-lead persistence concurrency gate

**Status:** IMPLEMENTED AND VERIFIED IN HOSTED DEV on PR #14. Application write path and Production persistence remain NOT IMPLEMENTED.

### Decision

Accept `public.persist_imported_lead(...)` as the verified one-lead imported/provider persistence boundary after a genuine simultaneous two-session same-key hosted Dev test passed.

The function remains limited to one imported lead per call. It is not a bulk CSV orchestrator and it does not authorize browser-supplied organization or actor identity.

### Implementation boundary

- `SECURITY INVOKER` PostgreSQL function.
- Authenticated user membership derives the organization.
- Source plus source external id form the imported-lead idempotency key.
- First successful call creates one contact, one lead, and one `lead_imported` event atomically.
- Same-key retry returns the existing lead without overwriting later human-editable fields.
- Transaction-scoped advisory locking plus the unique lead key protects concurrent same-key requests.
- Execute remains granted to `authenticated` and denied to `anon` and `public`.
- Email and phone remain excluded as automatic contact-deduplication keys.

### Verification

- Repository guard reverified exactly as `nileshsshirishkar/leadrescue-ai` before mutation.
- Hosted project: `LeadRescue AI Dev`, project ref `vzlltqutwsnnjzepyogj`.
- Hosted migration remains `20260824143703_create_atomic_imported_lead_function`.
- CI #63 passed on PR head `3e1cc3ff82771f463888f1836593cef6693efbaf` with `Verify` and `Database Tests` successful.
- A true simultaneous two-session hosted Dev test ran through two independent PostgreSQL cron job sessions under the controlled authenticated QA identity.
- First concurrent run used backend PIDs `406445` and `406444` with overlapping execution windows beginning within milliseconds of each other.
- Session A returned `created`.
- Session B returned `existing`.
- Both returned the same lead id `5943675d-cd18-41cd-98ab-6b6342ad5c94`.
- Direct database verification found exactly one logical lead, one corresponding contact, and one `lead_imported` event.
- Zero orphan contacts were found.
- Session B supplied different status and notes values, but the persisted status and notes from the creating session were not overwritten.
- Both sessions terminated successfully and no deadlock occurred.
- The temporary scheduled jobs, result table, test lead/contact/event rows, and temporary `pg_cron` extension were removed after evidence capture.
- Direct cleanup verification restored the Dev fixture baseline to 1 Auth user, 1 organization, 1 membership, 1 contact, 1 lead, 0 lead events, and 0 follow-up tasks.
- The concurrency fixture source external id had zero remaining rows after cleanup.
- CI #64 passed after the concurrency validation document was updated on PR head `4e105a00b68a9ec29cdf39c93a12ff1824507d7a`.

### Safety boundary

- Production and `main` were unchanged.
- No application API write endpoint was added.
- No bulk CSV orchestration was added.
- No localStorage migration was performed.
- No provider integration was added.
- The existing Supabase leaked-password-protection warning remains a separate Production-authentication gate.

### Promotion decision

PR #14 may move out of draft after final CI passes on the exact final head and may then merge into `develop` only. Do not merge this milestone to `main` and do not promote it to Production.

The next controlled engineering slice is the authenticated application one-lead create path using this verified persistence boundary with server-side validation and authenticated tenant derivation.

### Master Current State delta

After PR #14 merges, classify atomic one-lead imported persistence as IMPLEMENTED AND VERIFIED IN HOSTED DEV / DEVELOP. Remove the true two-session concurrency item from the open PR #14 gate. Application create, bulk CSV orchestration, lead detail/contact reads, ongoing status/task writes, reminders, founder pause enforcement, Production Supabase, provider connectors, and commercial readiness remain incomplete.

## 2026-08-23 - Lead write idempotency foundation

**Status:** IMPLEMENTED AND VERIFIED IN HOSTED DEV for the database prerequisite. Application lead/contact/event writes remain NOT IMPLEMENTED.

### Decision

Use `(organization_id, source, source_external_id)` as the idempotency key for future imported/provider-originated lead persistence. Keep manual/null external-id records compatible, but require imported external ids to be trimmed and non-empty. A retry must resolve to the existing lead without overwriting later human edits.

### Implementation

- Added a unique constraint on `(organization_id, source, source_external_id)`.
- Added database checks requiring `source` to be trimmed and non-empty.
- Added database checks requiring non-null `source_external_id` to be trimmed and non-empty.
- Added pgTAP coverage for same-tenant duplicate rejection, cross-tenant independence, null/manual compatibility, and malformed source-key rejection.
- Added `docs/supabase-write-contract.md` defining the future atomic contact + lead + audit-event persistence contract, retry semantics, tenant enforcement, rollback requirements, and validation gates.
- No application write endpoint or RPC function is included in this milestone.

### Verification

- Hosted Dev data was checked before migration. The controlled database had one fictional lead with a valid external id, no blank source/external-id values, and no duplicate source-key combination.
- CI run #52 passed the initial migration with `Verify` and `Database Tests` successful.
- The migration was applied to hosted `LeadRescue AI Dev` only.
- Hosted migration history now includes `20260823083811_add_lead_source_idempotency_constraints`.
- Hosted Dev was directly checked and contains `leads_org_source_external_unique`, `leads_source_nonempty_trimmed`, and `leads_source_external_id_nonempty_trimmed`.
- The repository migration filename was aligned to the exact hosted migration version.
- CI run #54 passed the corrected migration history with lint, typecheck, tests, build, local Supabase startup, and pgTAP database tests successful.

### Safety boundary

- RLS remains enabled and continues to be the database authorization boundary.
- Ordinary future application writes must use the authenticated user session. Service-role bypass is not approved for normal lead persistence.
- The client must not supply an authoritative organization id or actor id.
- Email and phone are not approved as automatic contact-deduplication keys.
- Browser-local workspace persistence remains unchanged.
- Production database/schema remains unchanged.
- No public signup, provider ingestion, CRM sync, WhatsApp, voice, booking, billing, or other integration is introduced.

### Promotion decision

PR #13 is eligible for merge into `develop` after this Decision Log update passes CI. Do not merge this database prerequisite to `main` as part of this milestone. The next implementation milestone may add a narrowly scoped atomic PostgreSQL function using `SECURITY INVOKER`, but only on a new controlled branch with dedicated rollback, concurrency, RLS, and retry tests before any application write endpoint is exposed.

### Master Current State delta

After PR #13 merges, classify lead-source idempotency constraints as IMPLEMENTED AND VERIFIED IN HOSTED DEV / DEVELOP. Application lead/contact/event writes, atomic persistence RPC, localStorage migration, Production persistence, and customer-ready ingestion remain NOT ESTABLISHED.

## 2026-08-23 - Read-only tenant-scoped lead retrieval

**Status:** IMPLEMENTED AND VERIFIED IN PREVIEW on PR #12. Application lead writes, browser persistence migration, and Production persistence remain NOT IMPLEMENTED.

### Decision

Add the next Supabase persistence slice as read-only tenant-scoped lead retrieval. Reuse the verified fail-closed organization context, keep RLS as the database authorization boundary, and also apply an explicit `organization_id` filter in the application query.

Do not add writes or migrate the existing browser-local workspace until tenant-scoped reads have been independently proven in Preview.

### Implementation

- Added a server-side tenant lead reader using the existing authenticated organization-context resolver.
- Queries `public.leads` with an explicit `organization_id` equality filter.
- Selects only approved lead columns rather than `select *`.
- Includes `source_external_id` so controlled fixtures can be positively identified during validation.
- Limits results to 100 rows and orders deterministically by creation time.
- Validates returned rows with Zod.
- Performs a second fail-closed application check that rejects any returned row whose `organization_id` differs from the resolved tenant.
- Added read-only `GET /api/leads` with `Cache-Control: private, no-store`.
- No database migration, contact write, lead write, event write, task write, or localStorage migration is included.

### Controlled Dev fixture

- Added one fictional non-production contact and one fictional lead inside the existing `LeadRescue QA` Dev organization solely for Preview validation.
- Lead fixture source external id: `qa-preview-read-001`.
- No real customer or client data was used.

### Verification

- GitHub Actions CI run #45 passed the initial implementation with `Verify` and `Database Tests` successful.
- After tightening the acceptance criterion to return and validate `source_external_id`, GitHub Actions CI run #47 passed `Verify`, including install, lint, typecheck, tests, and build.
- CI run #47 also passed `Database Tests`, including local Supabase startup and pgTAP tenant tests.
- Exact Vercel Preview deployment `dpl_9ofo6ArYTE54TdSZ2HkbAppVcymL` was READY on PR #12 head `6dd93142b6f2ba850c072d87f549f60f96eb6be1` before this documentation update.
- Signed-out Preview request to `/api/leads` returned `401 Authentication required.` with private/no-store caching.
- Signed-in controlled user request returned HTTP 200 with exactly one lead for organization `LeadRescue QA`.
- The returned lead positively identified the intended fictional fixture with `source_external_id = qa-preview-read-001`.
- The returned lead showed the expected `Follow-up needed` status and `Annual maintenance plan` service interest.
- The endpoint did not return contact email or phone data.
- Vercel runtime logs independently recorded `GET /api/leads` as HTTP 200 on deployment `dpl_9ofo6ArYTE54TdSZ2HkbAppVcymL`.
- A controlled Supabase transaction temporarily created an unrelated organization, contact, and lead, simulated the authenticated controlled user, and confirmed RLS exposed only the `LeadRescue QA` fixture lead. The transaction was rolled back.
- Focused unit tests cover authenticated reads, empty tenants, unauthenticated and ambiguous context, malformed rows, cross-tenant row rejection, and database failure.

### Safety boundary

- RLS remains the database security boundary. Explicit application filtering and returned-row validation are additional defense and performance controls.
- Browser-local workspace persistence remains unchanged.
- No Supabase lead writes are implemented in the application.
- Production Supabase authentication and Production persistence remain unimplemented.
- No public signup, automatic organization provisioning, multi-organization selector, customer onboarding, Meta/Google ingestion, CRM sync, WhatsApp, voice, billing, booking, or other provider integration is introduced.

### Promotion decision

PR #12 is eligible for merge into `develop` after this documentation-update commit passes CI. Do not merge this milestone to `main` or make Production Supabase changes.

### Master Current State delta

After PR #12 merges, the Master should classify read-only authenticated tenant-scoped lead retrieval as IMPLEMENTED AND VERIFIED IN PREVIEW / DEVELOP. Supabase-backed lead writes, contact/task persistence through the application, browser localStorage migration, Production authentication, Production database usage, multi-organization selection, and customer-ready multi-tenant operation remain NOT ESTABLISHED.

## 2026-08-22 - Read-only tenant organization context

**Status:** IMPLEMENTED AND VERIFIED IN PREVIEW and merged into `develop` on PR #11. Production persistence and application lead writes remain NOT IMPLEMENTED.

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
- Vercel Preview deployment `dpl_2YSvKeCXujRmRU2beTgxnuRv58df` was READY on PR #11 head `2326eb27c8537a20f41b47e8bf54e52af2d4239b` before its documentation update.
- Signed-out Preview request to `/api/organization-context` returned `401 Authentication required.` with private/no-store caching.
- Signed-in controlled user request returned HTTP 200 and only the `LeadRescue QA` organization with slug `leadrescue-qa` and role `owner`.
- Vercel runtime logs independently recorded the authenticated `/api/organization-context` request as HTTP 200 on the PR #11 Preview deployment.
- A controlled transaction created an unrelated temporary organization, simulated the authenticated controlled user, and confirmed RLS exposed only `LeadRescue QA` plus that user's single owner membership. The transaction was rolled back.
- Focused resolver tests cover unauthenticated access, no membership, multiple memberships, malformed rows, missing organization lookup, and dependency/database failure.
- PR #11 passed final CI and merged into `develop` as merge commit `1ef0015365477a3539efe82908ea7ed2a0bf4b17`.

### Safety boundary

- RLS remains the database security boundary. Explicit application query filters are additional defense and performance controls, not a replacement for RLS.
- Browser-local lead workspace persistence remains unchanged.
- Production Supabase authentication and Production persistence remain unimplemented.
- No public signup, automatic organization provisioning, customer onboarding, Meta/Google ingestion, CRM sync, WhatsApp, voice, billing, booking, or other provider integration is introduced.

### Promotion decision

The read-only tenant organization-context slice was merged into `develop` only. Do not merge it to `main` or make Production Supabase changes without a separate approved Production promotion.

### Master Current State delta

Authenticated tenant organization-context resolution is IMPLEMENTED AND VERIFIED IN PREVIEW and merged into `develop`. Supabase-backed lead/contact/task writes, Production authentication, Production database usage, multi-organization selection, and customer-ready multi-tenant application operation remain NOT ESTABLISHED.

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
