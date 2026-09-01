# LeadRescue AI Milestone 15 Import Status Taxonomy

**Status:** IMPLEMENTED AND VERIFIED IN LOCAL CI, HOSTED DEV, AND AUTHENTICATED PREVIEW. This milestone targets `develop` only and does not authorize `main`, public Production, Production Supabase migration, paid-plan changes, DNS changes, or real Client #1 data.

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

CI #171 completed successfully on evidence head `b8e2fcf874da71e27e06e37f25b8a9ccab6649e5`, including lint, typecheck, unit tests, build, local Supabase startup, and pgTAP database tests.

Because this final acceptance evidence update creates a new PR head, exact-head CI and Preview readiness must be reverified again before the merge decision.

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

## Authenticated Preview acceptance

The feature-branch Vercel Preview used for authenticated acceptance was deployment `dpl_H3x2qxKpzokL82aHttYXqk8ogT3G` on head `b8e2fcf874da71e27e06e37f25b8a9ccab6649e5`, with branch alias:

`https://leadrescue-ai-git-feat-import-status-taxonomy-lead-rescue-ai.vercel.app`

A signed-out request to `/api/workspace` had already returned HTTP 401 with `Authentication required.` and `Cache-Control: private, no-store`, confirming the Preview remained fail-closed while unauthenticated.

The user then authenticated as the existing fictional Tenant B Dev QA operator and imported a one-row fictional CSV through the supported drag-and-drop path. Browser evidence showed the local analyzed workspace increased from one existing fixture lead to two and displayed `Status Taxonomy QA`.

Vercel runtime logs independently recorded `POST /api/imports/csv` HTTP 200 at 19:38:59 on the exact acceptance deployment, followed by successful `/api/workspace` reads.

Direct hosted Dev verification found exactly one matching imported lead, one matching contact, and one `lead_imported` event in Tenant B QA. The persisted values were:

- contact name: `Status Taxonomy QA`;
- organization slug: `tenant-b-qa`;
- authoritative LeadRescue status: `New`;
- source: `Manual QA`;
- source external id: `csv:0bbe8be0-a8c1-4cba-a8d1-f47dd0ca3344:2`;
- preserved external source stage: `Proposal`.

This proves the deployed authenticated browser import path separates external source-stage context from authoritative LeadRescue workflow status.

The temporary acceptance lead had zero follow-up tasks and one import event. It was then removed from hosted Dev in controlled dependency order: event, lead, contact. Direct cleanup verification returned zero remaining matching leads, contacts, and events. The existing Dev Auth users, organizations, memberships, and baseline fixtures were not deleted.

Three earlier attempts using the file-picker button produced no `/api/imports/csv` request and no browser validation message. A fresh QA file imported successfully by drag-and-drop. This does not invalidate the status-taxonomy acceptance because the deployed CSV persistence path was exercised successfully, but the file-picker behavior is recorded as a separate usability follow-up rather than silently treated as proven.

## Safety boundary

- `main` remains unchanged.
- Public Vercel Production remains unchanged.
- Production Supabase remains unchanged and still contains zero fictional QA residue from Milestone 14 cleanup.
- No provider attribution fields are inferred from free-text source stage.
- No external stage is automatically converted into `Won`, `Lost`, `Appointment booked`, or another LeadRescue workflow outcome.
- No service-role bypass is introduced.
- RLS and authenticated tenant derivation remain the authorization boundary.

## Merge gate

Authenticated Preview acceptance and hosted Dev cleanup are complete. Before PR #29 can merge into `develop`:

1. verify exact final PR head after this evidence update;
2. require exact-head CI success;
3. require exact-head Vercel Preview READY;
4. keep the file-picker behavior as a separately tracked usability follow-up unless it becomes reproducible as an application defect;
5. bring PR #29 to a separate explicit Merge/Hold approval for `develop` only.

No `main` merge, public Production promotion, or Production Supabase migration is authorized by this milestone.