# LeadRescue AI Post-PR #29 Current State Delta

**Status:** VERIFIED CURRENT DELTA after PR #28 and PR #29 merged to `develop`. This file records newer direct evidence that supersedes stale Milestone 13/14 checklist statements without silently changing approved product or commercial policy.

## Current release state

- Locked repository: `nileshsshirishkar/leadrescue-ai`.
- `develop`: `d64dbad299bc01009c44d41a7cb39531bf7636c6`, the verified merge commit for PR #29.
- Post-merge GitHub Actions CI #173 completed successfully on that exact `develop` head.
- The matching Vercel `develop` Preview deployment `dpl_5XvcVNBopUJRvScyX5Vjo7BE3Ex4` is `READY` and uses branch alias `leadrescue-ai-git-develop-lead-rescue-ai.vercel.app`.
- `main` remains unchanged at `e933fe9a3546dc3d63a7c58ce48291d3d96da253` and public Vercel Production remains the older Phase 2 application.
- No `main` or public Production promotion is authorized by this delta.

## Production-environment acceptance completed through PR #28

A separate Supabase project, `LeadRescue AI Production` (`iumpokzozncoszwgywwn`, `ap-south-1`), was created and validated using the isolated `ops/production-environment` Vercel Preview. This was a Production-database acceptance environment, not a public Vercel Production promotion.

Verified fictional Production acceptance included:

- clean canonical schema migrations and RLS/security baseline;
- two independent tenant reads and direct cross-tenant access denial;
- authenticated workflow updates, audit events and `follow_up_tasks.due_at` behavior;
- reminder isolation;
- expired-token refresh behavior;
- wrong-password, signed-out and malformed-session fail-closed behavior;
- founder pause/reactivate enforcement;
- CSV retry/idempotency without duplicate logical leads or stale-retry overwrite of later human edits;
- controlled mixed-row import failure behavior without orphan contact creation;
- deletion/offboarding with an already-authenticated former tenant session failing closed after membership removal;
- final deletion of both fictional QA Auth users and all fictional application rows.

Final Production QA residue after cleanup was zero for Auth users, sessions, refresh tokens, organizations, profiles, memberships, contacts, leads, lead events and follow-up tasks. The canonical schema migrations remain in place.

Application rollback design and concrete Vercel deployment anchors were documented. An actual paid-plan Vercel rollback rehearsal and Supabase restore exercise remain unresolved Client #1 commercial gates.

The transient `AuthRefreshDiscardedError` observed during a concurrent refresh boundary did not cause a user-visible authentication failure. Current evidence classifies it as observe/no-code-change unless new runtime evidence proves an actual failure.

## Import status taxonomy completed through PR #29

PR #29 implemented and verified the approved separation between external/source stage and authoritative LeadRescue workflow status:

- incoming CSV/provider stages are preserved as `source_metadata.source_stage`;
- every newly persisted imported lead starts with authoritative LeadRescue status `New`;
- the authoritative workflow status is constrained to exactly `New`, `Follow-up needed`, `Interested`, `Qualified`, `Appointment booked`, `Won`, and `Lost`;
- no automatic mapping from arbitrary external stages into LeadRescue outcomes is introduced;
- idempotent retry behavior remains unchanged and does not overwrite later human edits.

Authenticated Tenant B Dev Preview acceptance proved external stage `Proposal` persisted separately while authoritative status remained `New`. Temporary QA residue was removed after verification.

A follow-up test on the post-merge `develop` Preview used the exact same known-good CSV through the **Choose CSV** file picker. Vercel recorded `POST /api/imports/csv` HTTP 200 and Hosted Dev again persisted one correct Tenant B QA lead with authoritative status `New` and source stage `Proposal`. That temporary lead/contact/event was removed and direct cleanup verification returned zero matching residue.

Therefore the earlier non-triggering file-picker attempts are **not currently reproducible** and are not classified as a confirmed application defect. No file-picker code change is justified from current evidence.

## Current Client #1 no-go items

The following remain unresolved before real Client #1 commercial lead data:

- paid Vercel commercial plan;
- Supabase Pro;
- leaked-password protection enabled and reverified after Supabase Pro upgrade;
- active Production backup configuration and a controlled restore test;
- actual paid-plan Vercel rollback verification;
- Production monitoring/alerting acceptance;
- durable rate-limit/abuse-protection configuration and numeric thresholds based on the selected commercial platform and load/abuse testing;
- repository private-plan/visibility decision before real client data or materially sensitive commercial assets;
- secondary human incident escalation contact;
- exact written support channel and business hours;
- actual Client #1 commercial terms and jurisdiction-specific privacy/contract/DPA wording;
- separate explicit `main` / public Production promotion and post-promotion acceptance.

Optional OpenAI enhancement remains disabled for the first live Client #1 onboarding until the approved processor/privacy wording and Production configuration are reverified.

## Exact next controlled direction

Do not promote `main` or public Production from this state. The next controlled work is Client #1 commercial/Production gate preparation: reconcile stale readiness documentation to this verified state, reverify current paid-plan/security capabilities from official vendor documentation, and bring explicit provider/billing decisions only where a purchase or Production-setting change is actually required.
