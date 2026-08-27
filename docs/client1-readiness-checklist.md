# LeadRescue AI Client #1 Readiness Checklist

**Status:** Milestone 13 control sheet. `PASS` means the stated evidence exists at the stated environment only. It does not imply Production or commercial readiness beyond that scope.

## A. Already verified in Dev / Preview

- [x] Authenticated sign-in/sign-out path verified in Preview.
- [x] Tenant context derives from authenticated user membership.
- [x] RLS and application checks block cross-tenant reads and writes in controlled tests.
- [x] Two independent users/organizations verified end to end in Preview.
- [x] Expired access-token refresh verified at runtime.
- [x] Invalid/malformed session fails closed with 401.
- [x] Founder organization `active` / `paused` enforcement implemented and tested.
- [x] Authenticated Supabase tenant workspace is authoritative for dashboard leads on `develop`.
- [x] Manual/CSV persistence uses authenticated tenant derivation and retry-safe idempotency.
- [x] Lead detail/contact read, workflow update, task creation/completion and reminders are server-backed in Dev/Preview.
- [x] No ordinary application service-role bypass.

## B. Milestone 13 policy / operations gates

- [x] Data inventory and current processor map drafted.
- [x] Incident severity and founder-run response runbook drafted.
- [x] Application/database rollback principles drafted.
- [x] Offboarding/deletion procedure drafted.
- [x] Integration register created with Dev/Preview/Production distinctions.
- [x] Commercial decision sheet created without inventing price/trial/refund/SLA terms.
- [ ] Client #1 permitted-data boundary explicitly approved.
- [ ] Live-data retention after termination explicitly approved.
- [ ] Export window explicitly approved.
- [ ] Backup RPO and RTO explicitly approved.
- [ ] Monitoring/alert ownership and notification path approved.
- [ ] Durable rate-limit architecture and numeric thresholds approved after commercial hosting plan is selected.
- [ ] Incident secondary/escalation contact identified.
- [ ] Support channel, support hours and non-SLA response wording approved.
- [ ] Price, billing period, pilot/trial, cancellation and refund/credit terms approved.
- [ ] OpenAI enhancement enabled/disabled decision made for Client #1.
- [ ] Legal/privacy/DPA jurisdiction review path confirmed.
- [ ] Repository visibility decision re-opened and resolved for commercial expansion.

## C. Current commercial blockers confirmed from live/vendor evidence

- [ ] **Vercel commercial plan:** current connected Vercel team is Hobby. Current Vercel Terms say Hobby is for personal/non-commercial use only. Upgrade is required before Client #1 commercial hosting and is a separate paid-plan approval.
- [ ] **Vercel data setting:** current Vercel Terms state Hobby/trial-Pro content may be used for model training subject to the applicable account setting. Reverify and set the commercial account/data preference before real client content.
- [ ] **Supabase leaked-password protection:** current Security Advisor reports it disabled. Supabase currently makes the feature available on Pro and above.
- [ ] **Supabase backup plan:** current Production design must use a plan with an approved backup policy. Current Supabase docs provide daily backups on Pro/Team/Enterprise; Pro exposes seven days. Free-tier Dev requires manual exports and is not sufficient evidence for Client #1 recovery.
- [ ] **Repository visibility:** repository is currently public. Existing approved policy requires a re-review before materially sensitive commercial code/assets or real client data expand. Current GitHub docs state rulesets/protected branches for private repositories require GitHub Pro/Team/Enterprise rather than GitHub Free.

## D. Milestone 14, separate Production environment gate

These are intentionally **not** completed by Milestone 13 documentation:

- [ ] Create separate Production Supabase project after explicit Production/cost approval.
- [ ] Apply clean versioned migrations to Production.
- [ ] Configure Production Auth and founder-managed provisioning.
- [ ] Configure Production Vercel environment variables/secrets.
- [ ] Run Production tenant-isolation acceptance with fictional records.
- [ ] Run Production write/import/task/reminder acceptance.
- [ ] Test deletion procedure with fictional Production-like tenant.
- [ ] Test database restore and record actual recovery evidence.
- [ ] Verify Production monitoring/alerting.
- [ ] Verify Production rate limiting/abuse protection.
- [ ] Verify rollback to a known-good deployment.

## E. Milestone 15, separate paid-plan/security gate

- [ ] Approve and purchase commercial Vercel plan.
- [ ] Approve and purchase appropriate Supabase plan.
- [ ] Enable and verify leaked-password protection.
- [ ] Confirm automatic backup retention and whether PITR is actually justified by approved RPO.
- [ ] Reverify Vercel rollback, monitoring and rate-limit features on the selected plan.
- [ ] Re-run Supabase Security Advisor and resolve all Client #1 blocking findings.

## F. Go / no-go rule

**Client #1 remains NO-GO for real commercial lead data** until all approved Milestone 13 decisions are closed and the separate Milestone 14-15 Production/paid-plan controls pass.

No Preview, Dev, documentation or vendor-plan research may be presented as Production proof.
