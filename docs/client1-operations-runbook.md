# LeadRescue AI Client #1 Operations Runbook

**Status:** Milestone 13 working draft. This is an operational readiness document, not evidence that Production is live or that an SLA exists.

## 1. Operating model for clients 1-10

- Founder provisions each organization and user manually.
- Public self-signup remains disabled.
- Founder controls organization `active` / `paused` access.
- Billing remains external/manual. No Stripe or in-app subscription state is part of the operating system for clients 1-10.
- Support is founder-managed. Exact support hours, response target and support channel are REQUIRES APPROVAL before they become client terms.
- Production promotion remains separate from Dev/Preview validation.

## 2. Daily operating checks

For a controlled Client #1 launch, the founder should check at least once each working day during the initial pilot:

1. Production application is reachable and authentication works.
2. Production Supabase project is healthy.
3. Recent application runtime errors and 5xx responses are reviewed.
4. Failed imports, unexpected 401/403/409 responses, and unusual spikes in requests are reviewed.
5. Follow-up reminders are returning expected due/overdue/upcoming tasks.
6. No organization is unexpectedly paused or missing membership.
7. Backup status is current under the approved Production backup plan.

These checks are a minimum founder-run pilot process, not a substitute for automated alerting.

## 3. Monitoring and alerting acceptance

Before Client #1 real data, Production must have an operational monitoring path that can detect at minimum:

- application unavailable / repeated 5xx;
- authentication failures above expected baseline;
- database/API unavailability;
- import failures;
- unexpected cross-tenant or authorization failures;
- AI enhancement/provider failures without disrupting deterministic LeadRescue operation;
- backup/restore failure or missed backup state where detectable;
- unusual traffic or rate-limit triggers.

Current Vercel runtime-error visibility is useful evidence, but the absence of recent Dev/Preview error clusters is not an SLA or Production-readiness claim.

### Alert ownership

**PROPOSED:** Founder is the primary incident owner for the first 10 clients. A secondary contact and notification channel must be identified before Client #1 so an incident is not dependent on one unavailable person.

## 4. Incident severity model

### SEV-1: security or tenant-boundary incident

Examples:

- confirmed or suspected cross-tenant data exposure;
- unauthorized access to lead/contact data;
- exposed secret or credential;
- destructive data corruption affecting a client;
- suspected compromise of Production Auth or database credentials.

Immediate actions:

1. Stop affected access. Use organization pause where it safely contains the issue; if scope is broader, disable the affected Production path.
2. Preserve logs/evidence. Do not delete relevant audit data during triage.
3. Rotate exposed credentials if applicable.
4. Determine affected organizations, records, time range and access path.
5. Do not resume normal service until the authorization/security boundary is understood and a safe recovery path is verified.
6. Follow applicable contractual/legal notification requirements. Exact statutory notification rules depend on jurisdiction and require legal review.

### SEV-2: material service or data-processing failure

Examples:

- Production application repeatedly unavailable;
- database unavailable;
- imports failing for an organization;
- follow-up workflow unable to save or load state;
- reminder engine unavailable.

Actions:

1. Confirm scope and whether data writes are safe.
2. Prefer fail-closed behavior over serving potentially incorrect tenant data.
3. If a recent release caused the issue, follow the rollback procedure.
4. Keep a timestamped incident record and communicate factual status to affected clients without inventing recovery times.

### SEV-3: degraded optional capability

Examples:

- OpenAI enhancement temporarily unavailable while deterministic scoring and human workflow still operate;
- non-critical UI or reporting issue.

Actions:

- Keep deterministic core operation available when safe.
- Record the issue and fix through the normal Dev -> Preview -> approval release path.

## 5. Rollback procedure

Production rollback must never be improvised from an unverified branch.

### Application rollback

1. Identify the exact last-known-good Production deployment and Git commit.
2. Confirm the incident is application/deployment related and not a database/data issue.
3. Roll back or promote the verified last-known-good deployment using the Production hosting plan's supported rollback mechanism.
4. Verify authentication, tenant access, lead workspace, write workflow and reminders using fictional/control records before declaring recovery.
5. Record the rollback commit/deployment and incident reason.

Current Vercel documentation makes specific Production rollback functionality plan-dependent. The exact Production rollback mechanism must be reverified after the commercial Vercel plan is selected.

### Database rollback / restore

Do not reverse schema/data changes by guessing or manually deleting rows during an incident.

1. Identify whether the problem is schema, application logic, or corrupted/deleted data.
2. Stop risky writes if continuing could worsen data loss.
3. Use the approved database backup/restore mechanism for the Production Supabase plan.
4. Restore testing must be performed with fictional Production-like data before Client #1.
5. After restore, verify migrations, RLS, Auth relationships, organization access, representative leads/tasks/events, and application acceptance.

Supabase currently provides automatic daily backups on Pro/Team/Enterprise plans. Pro exposes seven days of daily backups. PITR is an additional paid option and should only be selected if the approved RPO requires it. Free-tier Dev is not an acceptable substitute for a Production backup plan.

## 6. Backup / recovery acceptance criteria

Exact RPO and RTO are **REQUIRES APPROVAL**.

Before Client #1:

- Production backup mechanism is active and documented.
- A controlled restore is performed with fictional data.
- Post-restore tenant/RLS acceptance is run.
- Restore downtime and actual elapsed recovery time are recorded as evidence, without turning one test into an SLA promise.
- Off-platform logical export policy is decided if required by the approved recovery design.
- Backup retention is reflected accurately in the privacy/deletion wording.

## 7. Rate limiting and abuse protection

LeadRescue needs rate limits before commercial use, but a serverless in-memory counter is not an acceptable security control because it is not reliably shared across instances.

**Recommended architecture for approval:**

- Use an edge/platform or durable distributed rate-limit mechanism for sensitive routes.
- Key authenticated limits by organization and/or authenticated user where practical, not by browser-supplied organization identity.
- Keep stricter limits on expensive or abuse-sensitive operations such as AI enhancement and bulk imports.
- Return HTTP 429 for limited requests and avoid leaking private state in rate-limit responses.
- Authentication-provider rate limits remain separate from application route limits.

Vercel currently documents WAF/firewall rate limiting and an SDK that can use authenticated user/organization keys. The exact feature/plan and numeric thresholds must be reverified and load-tested after the commercial Vercel plan is approved. Numeric limits are deliberately not invented in this draft.

## 8. Production change procedure

Every material Production change follows:

1. isolated branch;
2. implementation;
3. lint, typecheck, tests, build, database tests where applicable;
4. Dev/Preview validation;
5. evidence capture;
6. explicit approval to merge to `develop` when required;
7. separate explicit approval for `main` / Production promotion;
8. Production smoke and acceptance checks;
9. rollback target recorded.

A Dev/Preview PASS never authorizes Production automatically.

## 9. Client onboarding checklist

Before giving Client #1 access:

- approved commercial terms and privacy/data terms exist;
- Production Supabase and Vercel plans are approved and active;
- Production environment variables/secrets are configured without exposing values;
- leaked-password protection and approved Auth settings are enabled;
- founder creates the client organization and authorized user(s);
- organization starts active only after provisioning verification;
- tenant isolation acceptance uses fictional/control records before real import;
- client receives permitted-data guidance and import instructions;
- real CSV import is observed on initial onboarding;
- reminders and workflow update are verified;
- support/escalation contact is provided;
- rollback and incident owner are known.

## 10. Client offboarding / deletion runbook

1. Verify the authorized requester and organization.
2. Pause organization access if immediate access termination is required.
3. Apply the approved export window, if any.
4. Record the deletion request and scope without copying unnecessary lead data into support notes.
5. Run the approved administrative tenant deletion procedure.
6. Verify expected organization/contact/lead/task/event/membership rows are gone from live Production.
7. Handle associated Auth identities according to the approved account policy rather than assuming every user should be deleted.
8. Record completion and explain that historical backups expire according to the documented backup retention policy.
9. Never promise deletion from backups earlier than the actual platform retention behavior permits.

The destructive procedure itself must be tested with fictional Production-like data before Client #1. It is not exposed as a routine user-facing button in the current application.

## 11. Support boundary

LeadRescue is a lead follow-up operating system. Founder support for the first pilot should cover access, imports, tenant workspace behavior, lead workflow, reminders and product defects.

Unless separately contracted, support should not be represented as:

- a guaranteed uptime SLA;
- 24/7 emergency support;
- managed advertising services;
- legal/privacy advice;
- medical/clinical advice;
- CRM implementation outside the approved LeadRescue scope;
- guaranteed lead conversion or ROI.

Exact support hours and response targets remain a commercial decision.

## 12. Evidence required to close Milestone 13

- approved permitted-data boundary;
- approved retention/deletion policy;
- approved backup RPO/RTO and restore method;
- monitoring/alerting design selected;
- rate-limit architecture selected;
- incident owner and escalation path approved;
- rollback runbook accepted;
- commercial terms decisions completed;
- repository visibility decision re-opened and resolved for commercial expansion;
- current security gaps recorded for Milestones 14-15 rather than misclassified as complete.
