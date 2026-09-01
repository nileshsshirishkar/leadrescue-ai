# LeadRescue AI Client #1 Readiness Checklist

**Status:** Current Client #1 control sheet after merged PR #28 and PR #29. `PASS` means the stated evidence exists at the stated environment only. Production-connected Preview acceptance is not the same as public Vercel Production promotion or commercial readiness.

## A. Core product and tenancy controls

- [x] Authenticated sign-in/sign-out path verified in Preview.
- [x] Tenant context derives from authenticated user membership.
- [x] RLS and application checks block cross-tenant reads and writes in controlled tests.
- [x] Two independent users/organizations verified end to end in Dev/Preview.
- [x] Expired access-token refresh verified at runtime.
- [x] Invalid/malformed session fails closed.
- [x] Wrong-password rejection is sanitized and does not authenticate a workspace.
- [x] Founder organization `active` / `paused` enforcement implemented and tested.
- [x] Authenticated Supabase tenant workspace is authoritative for operational dashboard leads on `develop`.
- [x] Manual/CSV persistence uses authenticated tenant derivation and retry-safe idempotency.
- [x] Lead detail/contact read, workflow update, task creation/completion and reminders are server-backed.
- [x] No ordinary application service-role bypass.
- [x] Authoritative LeadRescue workflow status is constrained to `New`, `Follow-up needed`, `Interested`, `Qualified`, `Appointment booked`, `Won`, `Lost`.
- [x] Incoming CSV/provider stage is preserved separately as source context and cannot silently control authoritative workflow status.

## B. Production-environment acceptance completed with fictional data

The following were verified against the separate Supabase project `LeadRescue AI Production` through an isolated Production-connected Vercel Preview. This does **not** mean the public `main` deployment has been promoted.

- [x] Separate Production Supabase project created.
- [x] Canonical versioned schema migrations applied and verified.
- [x] Production RLS/security baseline verified.
- [x] Production-connected Auth and founder-managed fictional provisioning verified.
- [x] Bidirectional tenant-isolated workspace reads verified.
- [x] Direct cross-tenant lead GET/PATCH denial verified.
- [x] Own-tenant workflow update, audit event and follow-up task behavior verified.
- [x] Reminder isolation verified.
- [x] Genuine expired-token refresh verified.
- [x] Signed-out, wrong-password and malformed-session fail-closed behavior verified.
- [x] Founder pause/reactivate behavior verified against an already-authenticated session.
- [x] CSV retry/idempotency verified without duplicate logical leads or stale-retry overwrite of later human edits.
- [x] Controlled mixed-row validation failure verified without orphan contact creation.
- [x] Fictional deletion/offboarding verified, including fail-closed access from a still-authenticated former tenant session after membership deletion.
- [x] Fictional Production QA identities and application rows removed; final QA residue verified at zero.
- [x] Application rollback design and concrete Vercel deployment anchors documented.
- [ ] Actual paid-plan Vercel rollback rehearsal completed.
- [ ] Production database restore exercise completed and recovery evidence recorded.

## C. Approved operating/privacy architecture already established

- [x] Data inventory and processor map drafted.
- [x] Incident severity and founder-run response runbook drafted.
- [x] Application/database rollback principles drafted.
- [x] Offboarding/deletion procedure drafted and fictional Production cleanup exercised.
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
- [x] Supabase Pro/leaked-password sequencing approved: must be purchased/enabled/verified before Client #1 real lead data is accepted.
- [x] Vercel timing approved: Hobby remains Dev/Preview only; an approved paid commercial plan must be active before Client #1 commercial hosting.
- [x] Legal/privacy review path approved: jurisdiction-specific contract/privacy/DPA review occurs once the actual seller entity and Client #1 jurisdiction are known.

## D. Current vendor/security facts reverified 02 September 2026

- [x] Connected Vercel team `LeadRescue AI` is still on `hobby`.
- [x] Current Vercel documentation states rollback to a specific older Production deployment is available on Pro or Enterprise.
- [x] Current Supabase documentation states leaked-password protection is available on Pro and above.
- [x] Current Supabase documentation states Pro projects receive automatic daily backups with seven days of daily-backup access.
- [x] PITR is a separate paid add-on and is not automatically required by the currently approved up-to-24-hour RPO target.
- [x] Current Supabase documentation supports restore-to-new-project on paid plans when physical backups are enabled; this is the preferred first restore-verification path because it can prove recovery without overwriting active Production.

## E. Current Client #1 commercial / Production blockers

- [ ] **Vercel commercial plan:** approve and purchase the selected paid commercial plan before Client #1 commercial hosting.
- [ ] **Supabase Pro:** purchase for the Production organization/project before real Client #1 lead data.
- [ ] **Leaked-password protection:** enable after the Supabase Pro upgrade and re-run Security Advisor until the warning is cleared.
- [ ] **Backup/restore:** verify active Production backup status and perform a controlled restore test with fictional data. Record elapsed recovery time and post-restore RLS/tenant checks without turning the test into an SLA.
- [ ] **Vercel rollback:** after the paid plan is active, verify supported rollback against a controlled known-good deployment before relying on it operationally.
- [ ] **Production monitoring:** configure and test the founder alert/observation path for availability, repeated 5xx, auth anomalies, import failures, database health and backup status.
- [ ] **Rate limiting / abuse protection:** configure a durable platform/distributed mechanism and approve numeric thresholds after the selected commercial hosting features and load/abuse tests are known.
- [ ] **Secondary incident contact:** identify one human escalation contact.
- [ ] **Support terms:** select exact written support channel and business hours.
- [ ] **Commercial terms:** select price, billing amount/period, pilot duration, cancellation notice and refund/credit terms after the actual target client is selected.
- [ ] **Privacy/legal terms:** complete jurisdiction-specific privacy/contract/DPA wording after seller/client jurisdiction is known.
- [ ] **Repository visibility:** resolve the private-repository/paid-GitHub-plan action before real client data or materially sensitive commercial assets are introduced.
- [ ] **Public Production promotion:** separately approve and execute `main` / public Vercel Production promotion, then run post-promotion acceptance before Client #1 is declared live.

## F. Current release state

- [x] PR #28 merged to `develop` after Production-environment fictional acceptance.
- [x] PR #29 merged to `develop` after source-stage/status-taxonomy acceptance.
- [x] Post-merge `develop` head `d64dbad299bc01009c44d41a7cb39531bf7636c6` passed CI #173.
- [x] Matching `develop` Vercel Preview is READY.
- [x] The `Choose CSV` file-picker path was retested on post-merge `develop` with the known-good QA file and succeeded with `POST /api/imports/csv` HTTP 200; the prior non-triggering attempts are not currently reproducible.
- [x] Temporary Dev QA data from that retest was removed and matching residue returned to zero.
- [ ] `main` remains intentionally unpromoted.

## G. Go / no-go rule

**Client #1 remains NO-GO for real commercial lead data** until the remaining paid-plan, security, recovery, monitoring/rate-limit, commercial/privacy and public-Production acceptance gates above pass.

Dev/Preview success and fictional Production-connected acceptance must not be presented as commercial Production readiness. `main`, public Production, provider billing, real Client #1 data, and any materially sensitive Production setting change remain separate approval gates.
