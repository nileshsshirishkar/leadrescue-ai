# LeadRescue AI Decision Log Addendum - 02 September 2026

This addendum records material decisions and verified evidence after the currently committed `docs/decision-log.md` entries. It should be treated as a current decision/source delta until the consolidated Decision Log is next refreshed.

## 2026-09-02 - Production-environment fictional acceptance completed

**Status:** VERIFIED through PR #28 and merged to `develop`. Public Vercel Production remains unpromoted.

### Decision

Accept the separate Supabase Production environment and Production-connected Preview as sufficient fictional acceptance evidence for the implemented tenant/auth/import/workflow controls, without calling the public application commercially Production-ready.

### Verified boundary

- Separate Supabase project `LeadRescue AI Production` was created in `ap-south-1` and received the canonical versioned migrations.
- Production-connected fictional two-tenant acceptance covered tenant-isolated reads, direct cross-tenant denial, workflow writes, audit events, follow-up tasks/reminders, auth expiry/refresh, wrong-password and malformed-session fail-closed behavior, founder pause/reactivate, CSV retry/idempotency and controlled row failure.
- Fictional deletion/offboarding passed, including fail-closed access for a still-authenticated user after membership removal.
- All fictional Production QA Auth identities and application rows were deleted and final QA residue was verified at zero.
- Application rollback design and concrete deployment anchors were recorded.
- `AuthRefreshDiscardedError` observed at a concurrent refresh boundary did not cause user-visible auth failure and is classified observe/no-code-change unless new evidence changes that assessment.

### Remaining boundary

- This evidence does not authorize `main` or public Production promotion.
- Actual paid-plan Vercel rollback rehearsal and Supabase restore verification remain Client #1 gates.
- Supabase Pro, leaked-password protection, monitoring/rate limits and other commercial controls remain required before real client data.

## 2026-09-02 - Imported source stage is not authoritative workflow status

**Status:** IMPLEMENTED, VERIFIED and merged through PR #29.

### Decision

Keep external/imported provider stage separate from the authoritative LeadRescue workflow status.

- Preserve incoming CSV/provider stage as `source_metadata.source_stage`.
- Create new imported leads with authoritative LeadRescue status `New`.
- Constrain authoritative statuses to exactly `New`, `Follow-up needed`, `Interested`, `Qualified`, `Appointment booked`, `Won`, and `Lost`.
- Do not automatically map arbitrary provider stages such as `Proposal`, `At risk`, `Contacted` or `Booked` into LeadRescue outcomes.
- Preserve existing retry/idempotency behavior so a stale retry does not overwrite later human edits.

### Verification

Authenticated Tenant B Dev Preview acceptance persisted external source stage `Proposal` while authoritative LeadRescue status remained `New`. Database constraints and automated tests enforce the seven-status taxonomy.

## 2026-09-02 - CSV file-picker is not a confirmed defect

**Status:** CURRENT EVIDENCE: NOT REPRODUCIBLE.

Earlier browser attempts using the file picker produced no server import request, while drag-and-drop later succeeded. A controlled retest after PR #29 merged used the exact same known-good QA CSV through **Choose CSV** on the current `develop` Preview.

Vercel recorded `POST /api/imports/csv` HTTP 200, Hosted Dev persisted exactly one correct Tenant B QA lead with authoritative status `New` and source stage `Proposal`, and the temporary lead/contact/event was then removed with zero matching residue.

### Decision

Do not change the CSV file-picker code based on the earlier non-reproducible attempts. Reopen only if a reproducible browser/application failure is captured with exact steps and evidence.

## 2026-09-02 - Current Client #1 commercial gate remains NO-GO

**Status:** APPROVED BOUNDARY, current vendor facts reverified.

- Connected Vercel team remains Hobby.
- Current Vercel documentation states rollback to a specific older Production deployment is a Pro/Enterprise capability.
- Current Supabase documentation states leaked-password protection is available on Pro and above.
- Current Supabase documentation states Pro projects receive automatic daily backups with seven days of daily-backup access.
- PITR remains a separate paid add-on and is not selected by assumption. The approved initial internal RPO target remains up to 24 hours, so daily Pro backups remain the baseline unless later evidence justifies a lower RPO.
- Restore-to-new-project on a paid Supabase plan with physical backups is the preferred first restore-verification method because it can prove recoverability without overwriting active Production.

### No-go items before real Client #1 data

Paid Vercel commercial plan, Supabase Pro, leaked-password protection verification, controlled database restore evidence, paid-plan Vercel rollback verification, Production monitoring/alerting, durable rate limits with tested thresholds, repository visibility decision, incident escalation contact, support terms, actual commercial/privacy terms, and a separately approved `main` / public Production promotion with post-promotion acceptance.

No real Client #1 data or commercial Production-readiness claim is authorized by PR #28, PR #29, Dev/Preview evidence, or this addendum.
