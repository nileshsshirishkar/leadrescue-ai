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
- [x] Client #1 target profile approved: one small, non-regulated service-business pilot with a small named user set.
- [x] Permitted-data boundary approved: ordinary business lead/contact/follow-up data only; unnecessary sensitive categories excluded.
- [x] Offboarding policy approved: 14-day export window and live tenant-data deletion within 30 days after a verified termination/deletion request, with backups aging out according to actual Production retention.
- [x] Initial backup/RPO policy approved: Supabase Pro daily backups at Client #1 onboarding, internal RPO target up to 24 hours, no published RTO/recovery SLA before restore testing.
- [x] Monitoring architecture approved: founder primary incident owner, Production Vercel observability plus Supabase health/security/backup visibility.
- [x] Durable rate-limit architecture approved; numeric thresholds intentionally deferred until paid-plan selection and load/abuse testing.
- [x] Support model approved: founder-managed written-channel support on a reasonable-efforts basis during stated business hours, without 24/7 or guaranteed-response/restoration SLA.
- [x] OpenAI decision approved: optional enhancement remains disabled for the first live Client #1 onboarding until processor/privacy wording, current data controls and Production configuration are approved and verified.
- [x] Supabase Pro/leaked-password sequencing approved: may remain pending during Dev/Preview completion, but must be purchased/enabled/verified before Client #1 real lead data is accepted.
- [x] Repository timing approved: visibility may remain unchanged during Dev/Preview, but private-repository/paid-GitHub-plan decision must be resolved before real Client #1 data or materially sensitive commercial assets are introduced.
- [x] Vercel timing approved: current Hobby remains Dev/Preview only; commercial paid plan must be active before Client #1 commercial hosting.
- [x] Legal/privacy review path approved: jurisdiction-specific contract/privacy/DPA review occurs once the actual seller entity and Client #1 jurisdiction are known.

### Approved deferred details, to close before Client #1 onboarding or offer

- [ ] Identify one secondary human incident escalation contact.
- [ ] Select exact written support channel and business hours.
- [ ] Set numeric rate-limit thresholds after commercial hosting selection and load/abuse testing.
- [ ] Select price, billing amount/period, pilot duration, cancellation notice and refund/credit terms after the actual target client is selected.
- [ ] Complete jurisdiction-specific privacy/contract/DPA wording after the actual seller/client jurisdiction is known.
- [ ] Re-resolve repository private-plan/visibility action at the commercial-expansion gate.

These are explicitly deferred execution details under the approved package. They do not block continued Dev/Preview work or closing Milestone 13 governance documentation.

## C. Current Client #1 commercial/Production blockers

- [ ] **Vercel commercial plan:** current connected Vercel team is Hobby. Upgrade to an approved commercial plan is required before Client #1 commercial hosting.
- [ ] **Vercel account/data settings:** reverify relevant commercial account/data settings before real client content.
- [ ] **Supabase Pro and leaked-password protection:** at Client #1 onboarding, before accepting real commercial lead data, purchase Supabase Pro, enable leaked-password protection, re-run Security Advisor and verify the warning is cleared.
- [ ] **Supabase backup plan:** verify the approved Production backup configuration and restore path before real lead data is accepted.
- [ ] **Repository visibility:** resolve the private-repository/paid-GitHub-plan decision before real client data or materially sensitive commercial assets are introduced.

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
- [ ] At Client #1 onboarding, purchase Supabase Pro before real client lead data is accepted.
- [ ] Enable and verify leaked-password protection immediately after the Supabase Pro upgrade and confirm the Security Advisor warning is cleared.
- [ ] Confirm automatic backup retention and whether PITR is actually justified by the approved RPO.
- [ ] Reverify Vercel rollback, monitoring and rate-limit features on the selected plan.
- [ ] Re-run Supabase Security Advisor and resolve all Client #1 blocking findings.

## F. Go / no-go rule

**Client #1 remains NO-GO for real commercial lead data** until the separate Production, paid-plan, security, legal/privacy and acceptance gates pass.

The approved policy package closes Milestone 13 operating-policy architecture. It does not make Dev/Preview into Production, authorize real client data, purchase paid plans, change repository visibility or approve a `main` promotion.

No Preview, Dev, documentation or vendor-plan research may be presented as Production proof.
