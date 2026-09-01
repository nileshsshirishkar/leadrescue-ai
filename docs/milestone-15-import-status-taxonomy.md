# LeadRescue AI Milestone 15 Import Status Taxonomy

**Status:** IMPLEMENTED AND VERIFIED IN LOCAL CI, HOSTED DEV, AND SIGNED-OUT PREVIEW. Authenticated Preview import acceptance remains pending. This milestone targets `develop` only and does not authorize `main`, public Production, Production Supabase migration, paid-plan changes, DNS changes, or real Client #1 data.

## Approved decision

Incoming CSV/provider stage vocabulary is source context, not authoritative LeadRescue workflow state.

- Imported source stages such as `Proposal`, `At risk`, `Contacted`, or `Booked` are preserved separately as `source_metadata.source_stage`.
- Every newly persisted imported lead starts with authoritative LeadRescue status `New`.
- Authoritative LeadRescue statuses are limited to exactly: `New`, `Follow-up needed`, `Interested`, `Qualified`, `Appointment booked`, `Won`, and `Lost`.
- No automatic mapping from external stage vocabulary into LeadRescue workflow outcomes is introduced.
- Existing idempotent retry behavior remains unchanged. A same-key retry returns the existing lead without overwriting later human edits.

## Implementation

PR #29, branch `feat/import-status-taxonomy`, adds the following controls:

- CSV headings such as `Status`, `Lead Status`, `Pipeline Status`, and `Stage` normalize to `sourceStage`, while local authoritative status is initialized to `New`.
- The CSV client sends `sourceStage` separately from `status`.
- The server accepts explicit `sourceStage` and preserves backward compatibility by treating a legacy client's incoming `status` value only as a source-stage fallback.
- The one-lead create validation boundary permits only authoritative status `New` during creation.
- `public.persist_imported_lead(...)` keeps its existing RPC signature for compatibility but treats its legacy `p_status` argument as external source-stage input, stores it in `source_metadata.source_stage`, and inserts authoritative status `New`.
- `lead_imported` audit-event metadata also records the source stage when supplied.
- The database adds `leads_status_approved_check` for the exact seven approved LeadRescue statuses.
- Authenticated workspace reads expose `sourceStage` separately from `status`.
- Deterministic scoring can use verified source-stage context without changing authoritative LeadRescue status.

## Automated verification

Dedicated tests cover:

- CSV heading normalization into source stage rather than LeadRescue workflow status;
- the bundled fictional sample CSV, including external stages such as `Proposal`;
- CSV-client forwarding of `sourceStage` and authoritative `New` separately;
- legacy CSV-client compatibility where an old `status` field becomes source-stage context rather than workflow authority;
- create-path rejection of a non-`New` authoritative status;
- persistence of source stage separately from authoritative status;
- workspace source-stage mapping;
- deterministic scoring using source-stage context;
- database creation with external stage `Proposal`, persisted workflow status `New`, source metadata preservation, and CHECK-constraint rejection of invalid workflow status values.

Exact-head CI #170 completed successfully on pre-evidence head `0c1d4443d5dd45ef2682a8ba3365556cd308f081`, including lint, typecheck, unit tests, build, local Supabase startup, and pgTAP database tests.

Because this evidence file changes the PR head, exact-head CI must be rerun before merge readiness.

## Hosted Dev verification

Hosted Dev project: `LeadRescue AI Dev`, ref `vzlltqutwsnnjzepyogj`.

Before migration, direct Dev verification showed the existing controlled leads used only the already-approved `Follow-up needed` status, so the new CHECK constraint did not conflict with existing Dev fixture data.

The status-taxonomy migration was applied to hosted Dev only. Hosted migration history now records:

- `20260901190441_enforce_lead_status_taxonomy`

The repository migration filename was aligned to that exact hosted Dev migration version.

Direct hosted Dev verification confirmed `leads_status_approved_check` allows only the seven approved LeadRescue statuses.

A controlled transaction then created a temporary fictional Auth user, organization, membership, and imported lead, called `public.persist_imported_lead(...)` with external source stage `Proposal`, and verified the resulting lead inside the transaction had:

- authoritative `status = 'New'`;
- `source_metadata.source_stage = 'Proposal'`.

The transaction was rolled back. A subsequent direct residue check confirmed zero temporary Auth users, organizations, contacts, leads, and lead events from that hosted verification.

Production Supabase was not mutated.

## Preview verification

The feature-branch Vercel Preview for pre-evidence head `0c1d4443d5dd45ef2682a8ba3365556cd308f081` was `READY` as deployment `dpl_3k9WbPRiy2kr83QKVbgSSCgQnj49` with branch alias:

`https://leadrescue-ai-git-feat-import-status-taxonomy-lead-rescue-ai.vercel.app`

A signed-out request to `/api/workspace` returned HTTP 401 with `Authentication required.` and `Cache-Control: private, no-store`, confirming the Preview remains fail-closed while unauthenticated.

Authenticated Preview acceptance is still required to prove the browser CSV path sends source-stage context through the deployed application into hosted Dev persistence and that a refreshed workspace returns authoritative status `New` plus the preserved source stage.

## Safety boundary

- `main` remains unchanged.
- Public Vercel Production remains unchanged.
- Production Supabase remains unchanged and still contains zero fictional QA residue from Milestone 14 cleanup.
- No provider attribution fields are inferred from free-text source stage.
- No external stage is automatically converted into `Won`, `Lost`, `Appointment booked`, or another LeadRescue workflow outcome.
- No service-role bypass is introduced.
- RLS and authenticated tenant derivation remain the authorization boundary.

## Remaining gate

Before PR #29 can be considered merge-ready for `develop`:

1. run one authenticated fictional CSV import through the exact feature-branch Preview against hosted Dev;
2. verify the resulting persisted row has authoritative status `New` and the incoming external stage in `source_metadata.source_stage`;
3. verify the refreshed workspace exposes both values separately;
4. clean the temporary hosted Dev import residue;
5. update this evidence with the exact final PR head and acceptance result;
6. rerun exact-head CI and Preview checks;
7. bring PR #29 to a separate explicit Merge/Hold gate for `develop` only.
